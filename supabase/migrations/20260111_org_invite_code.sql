-- Organization invite code (hybrid onboarding)

CREATE OR REPLACE FUNCTION generate_unique_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'IGR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM organizations WHERE invite_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS invite_code text;

UPDATE organizations
SET invite_code = generate_unique_invite_code()
WHERE invite_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_invite_code_key
  ON organizations (invite_code);

CREATE OR REPLACE FUNCTION generate_org_invite_code(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  v_code := generate_unique_invite_code();

  UPDATE organizations
  SET invite_code = v_code
  WHERE id = p_org_id;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION join_organization_with_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_email text;
  v_user_name text;
BEGIN
  v_org_id := NULL;
  SELECT id INTO v_org_id
  FROM organizations
  WHERE invite_code = upper(trim(p_code))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  v_email := auth.jwt() ->> 'email';
  v_user_name := COALESCE(auth.jwt() -> 'user_metadata' ->> 'name', v_email);

  IF EXISTS (SELECT 1 FROM volunteers WHERE auth_user_id = auth.uid()) THEN
    UPDATE volunteers
    SET organization_id = v_org_id,
        access_level = COALESCE(access_level, 'volunteer')
    WHERE auth_user_id = auth.uid();
  ELSE
    INSERT INTO volunteers (id, auth_user_id, organization_id, access_level, name, email, created_at)
    VALUES (gen_random_uuid(), auth.uid(), v_org_id, 'volunteer', v_user_name, v_email, now());
  END IF;

  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_church_and_admin(church_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_volunteer_id uuid;
  v_email text;
  v_user_name text;
BEGIN
  -- Get user info from auth
  v_email := auth.jwt() ->> 'email';
  v_user_name := COALESCE(auth.jwt() -> 'user_metadata' ->> 'name', v_email);

  -- Generate UUIDs
  v_org_id := gen_random_uuid();
  v_volunteer_id := gen_random_uuid();

  -- Create the organization with invite code
  INSERT INTO organizations (id, name, created_at, invite_code)
  VALUES (v_org_id, church_name, now(), generate_unique_invite_code());

  -- Check if volunteer exists for this auth user
  IF EXISTS (SELECT 1 FROM volunteers WHERE auth_user_id = auth.uid()) THEN
    -- Update existing volunteer
    UPDATE volunteers
    SET organization_id = v_org_id,
        access_level = 'admin'
    WHERE auth_user_id = auth.uid();
  ELSE
    -- Create new volunteer as admin
    INSERT INTO volunteers (id, auth_user_id, organization_id, access_level, name, email, created_at)
    VALUES (v_volunteer_id, auth.uid(), v_org_id, 'admin', v_user_name, v_email, now());
  END IF;

  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_org_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION join_organization_with_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_church_and_admin(text) TO authenticated;

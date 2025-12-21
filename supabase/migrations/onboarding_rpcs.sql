-- RPC: claim_profile
-- Links the current auth user to an existing volunteer record by email
-- This is called after login to claim any pre-existing volunteer profile
CREATE OR REPLACE FUNCTION claim_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get the email from the authenticated user
  v_email := auth.jwt() ->> 'email';
  
  -- Update any volunteer with matching email that has no auth_user_id
  UPDATE volunteers
  SET auth_user_id = auth.uid()
  WHERE email = v_email
    AND (auth_user_id IS NULL OR auth_user_id = auth.uid());
END;
$$;

-- RPC: create_church_and_admin
-- Creates a new organization and makes the current user an admin volunteer
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
  
  -- Create the organization
  INSERT INTO organizations (id, name, created_at)
  VALUES (v_org_id, church_name, now());
  
  -- Check if volunteer exists for this auth user
  IF EXISTS (SELECT 1 FROM volunteers WHERE auth_user_id = auth.uid()) THEN
    -- Update existing volunteer
    UPDATE volunteers
    SET organization_id = v_org_id,
        access_level = 'admin',
        can_lead = true
    WHERE auth_user_id = auth.uid();
  ELSE
    -- Create new volunteer as admin
    INSERT INTO volunteers (id, auth_user_id, organization_id, access_level, can_lead, name, email, created_at)
    VALUES (v_volunteer_id, auth.uid(), v_org_id, 'admin', true, v_user_name, v_email, now());
  END IF;
  
  RETURN v_org_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION claim_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION create_church_and_admin(text) TO authenticated;

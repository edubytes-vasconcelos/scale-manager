-- Preachers table, normalization, and permissions

CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preacher_type') THEN
    CREATE TYPE preacher_type AS ENUM ('interno', 'convidado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS preachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_normalized text NOT NULL,
  type preacher_type NOT NULL DEFAULT 'interno',
  church text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS can_manage_preaching_schedule boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS preachers_org_name_normalized_key
  ON preachers (organization_id, name_normalized);

CREATE OR REPLACE FUNCTION normalize_preacher_name(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(unaccent(lower(input)), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION get_service_volunteer_assignments(p_assignments jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_assignments) = 'object'
      THEN COALESCE(p_assignments->'volunteers', '[]'::jsonb)
    WHEN jsonb_typeof(p_assignments) = 'array'
      THEN p_assignments
    ELSE '[]'::jsonb
  END;
$$;

CREATE OR REPLACE FUNCTION set_preacher_name_normalized()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name_normalized := normalize_preacher_name(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preachers_set_name_normalized ON preachers;
CREATE TRIGGER preachers_set_name_normalized
BEFORE INSERT OR UPDATE OF name ON preachers
FOR EACH ROW
EXECUTE FUNCTION set_preacher_name_normalized();

CREATE OR REPLACE FUNCTION can_manage_preaching_schedule(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM volunteers v
    WHERE v.auth_user_id = auth.uid()
      AND v.organization_id = p_org_id
      AND (v.access_level = 'admin' OR v.can_manage_preaching_schedule = true)
  );
$$;

CREATE OR REPLACE FUNCTION upsert_preacher(
  p_organization_id uuid,
  p_name text,
  p_type preacher_type DEFAULT 'interno',
  p_church text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS preachers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized text;
  v_preacher preachers;
BEGIN
  v_normalized := normalize_preacher_name(p_name);

  INSERT INTO preachers (organization_id, name, name_normalized, type, church, notes)
  VALUES (p_organization_id, p_name, v_normalized, p_type, p_church, p_notes)
  ON CONFLICT (organization_id, name_normalized) DO NOTHING
  RETURNING * INTO v_preacher;

  IF v_preacher.id IS NULL THEN
    SELECT * INTO v_preacher
    FROM preachers
    WHERE organization_id = p_organization_id
      AND name_normalized = v_normalized
    LIMIT 1;
  END IF;

  RETURN v_preacher;
END;
$$;

ALTER TABLE preachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS preachers_select ON preachers;
CREATE POLICY preachers_select
  ON preachers
  FOR SELECT
  USING (is_member_of_org(organization_id));

DROP POLICY IF EXISTS preachers_insert ON preachers;
CREATE POLICY preachers_insert
  ON preachers
  FOR INSERT
  WITH CHECK (can_manage_preaching_schedule(organization_id));

DROP POLICY IF EXISTS preachers_update ON preachers;
CREATE POLICY preachers_update
  ON preachers
  FOR UPDATE
  USING (can_manage_preaching_schedule(organization_id))
  WITH CHECK (can_manage_preaching_schedule(organization_id));

DROP POLICY IF EXISTS preachers_delete ON preachers;
CREATE POLICY preachers_delete
  ON preachers
  FOR DELETE
  USING (can_manage_preaching_schedule(organization_id));

DROP POLICY IF EXISTS services_preachers_guard ON services;
CREATE POLICY services_preachers_guard
  ON services
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    CASE
      WHEN jsonb_typeof(assignments) = 'object'
        AND jsonb_typeof(assignments->'preachers') = 'array'
        AND jsonb_array_length(assignments->'preachers') > 0
      THEN can_manage_preaching_schedule(organization_id)
      ELSE true
    END
  )
  WITH CHECK (
    CASE
      WHEN jsonb_typeof(assignments) = 'object'
        AND jsonb_typeof(assignments->'preachers') = 'array'
        AND jsonb_array_length(assignments->'preachers') > 0
      THEN can_manage_preaching_schedule(organization_id)
      ELSE true
    END
  );

DROP POLICY IF EXISTS services_preachers_insert ON services;
CREATE POLICY services_preachers_insert
  ON services
  FOR INSERT
  WITH CHECK (can_manage_preaching_schedule(organization_id));

DROP POLICY IF EXISTS "Leader can manage only own ministry volunteers (jsonb)" ON services;
CREATE POLICY "Leader can manage only own ministry volunteers (jsonb)"
  ON services
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM volunteers leader
      WHERE (leader.auth_user_id = auth.uid())
        AND (leader.access_level = ANY (ARRAY['admin'::text, 'leader'::text]))
        AND (leader.organization_id = services.organization_id)
    )
  )
  WITH CHECK (
    NOT (
      EXISTS (
        SELECT 1
        FROM (
          jsonb_array_elements(get_service_volunteer_assignments(services.assignments)) a(value)
          JOIN volunteers vol ON ((vol.id = ((a.value ->> 'volunteerId'::text))::uuid))
        )
        WHERE (
          (vol.organization_id <> services.organization_id)
          OR (NOT (
            EXISTS (
              SELECT 1
              FROM (
                jsonb_array_elements(vol.ministry_assignments) vma(value)
                JOIN jsonb_array_elements((
                  SELECT leader.ministry_assignments
                  FROM volunteers leader
                  WHERE (leader.auth_user_id = auth.uid())
                )) lma(value)
                ON (((vma.value ->> 'ministryId'::text) = (lma.value ->> 'ministryId'::text)))
              )
              WHERE (((lma.value ->> 'isLeader'::text))::boolean = true)
            )
          ))
        )
      )
    )
  );

DROP POLICY IF EXISTS "Volunteer can RSVP own assignment" ON services;
CREATE POLICY "Volunteer can RSVP own assignment"
  ON services
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM volunteers v
      WHERE (v.auth_user_id = auth.uid())
        AND (v.organization_id = services.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM (
        jsonb_array_elements(get_service_volunteer_assignments(services.assignments)) a(value)
        JOIN volunteers v ON ((v.id = ((a.value ->> 'volunteerId'::text))::uuid))
      )
      WHERE (v.auth_user_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION update_service_assignment_status(
  p_service_id text,
  p_volunteer_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignments jsonb;
  v_volunteers jsonb;
BEGIN
  SELECT assignments INTO v_assignments
  FROM services
  WHERE id = p_service_id OR id_uuid::text = p_service_id
  LIMIT 1;

  IF v_assignments IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  IF jsonb_typeof(v_assignments) = 'object' THEN
    v_volunteers := COALESCE(v_assignments->'volunteers', '[]'::jsonb);
  ELSE
    v_volunteers := COALESCE(v_assignments, '[]'::jsonb);
  END IF;

  v_volunteers := COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN (a->>'volunteerId')::uuid = p_volunteer_id THEN
            CASE
              WHEN p_note IS NULL THEN jsonb_set(a, '{status}', to_jsonb(p_status))
              ELSE jsonb_set(
                jsonb_set(a, '{status}', to_jsonb(p_status)),
                '{note}',
                to_jsonb(p_note)
              )
            END
          ELSE a
        END
      )
      FROM jsonb_array_elements(v_volunteers) AS a
    ),
    '[]'::jsonb
  );

  IF jsonb_typeof(v_assignments) = 'object' THEN
    v_assignments := jsonb_set(v_assignments, '{volunteers}', v_volunteers, true);
  ELSE
    v_assignments := v_volunteers;
  END IF;

  UPDATE services
  SET assignments = v_assignments
  WHERE id = p_service_id OR id_uuid::text = p_service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_preacher(uuid, text, preacher_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_service_assignment_status(text, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION check_volunteer_assignment_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    user_access_level text;
    user_is_leader boolean := FALSE;
    old_user_assignment jsonb := NULL;
    new_user_assignment jsonb := NULL;
    old_other_assignments jsonb := '[]'::jsonb;
    new_other_assignments jsonb := '[]'::jsonb;
    old_elem jsonb;
    new_elem jsonb;
    is_user_on_assigned_team boolean := FALSE;
BEGIN
    SELECT access_level, (ministry_assignments @> '[{"canLead": true}]')
    INTO user_access_level, user_is_leader
    FROM public.volunteers
    WHERE id = current_user_id;

    IF user_access_level = 'admin' OR user_is_leader THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(get_service_volunteer_assignments(OLD.assignments)) AS assign
        WHERE (assign->>'volunteerId')::uuid = current_user_id
    ) INTO old_user_assignment;
    
    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(get_service_volunteer_assignments(OLD.assignments)) AS assign
        JOIN public.teams t ON (assign->>'teamId')::uuid = t.id
        WHERE current_user_id = ANY(t.member_ids)
    ) INTO is_user_on_assigned_team;

    IF NOT (old_user_assignment IS NOT NULL OR is_user_on_assigned_team) THEN
        RAISE EXCEPTION 'Ação negada: Você não está atribuído a este serviço para poder modificá-lo.';
    END IF;

    IF jsonb_array_length(get_service_volunteer_assignments(OLD.assignments)) !=
       jsonb_array_length(get_service_volunteer_assignments(NEW.assignments)) THEN
        RAISE EXCEPTION 'Ação negada: Voluntários só podem atualizar o status de suas próprias atribuições, não adicionar ou remover.';
    END IF;

    old_user_assignment := NULL;
    new_user_assignment := NULL;
    old_other_assignments := '[]'::jsonb;
    new_other_assignments := '[]'::jsonb;

    FOR old_elem IN SELECT * FROM jsonb_array_elements(get_service_volunteer_assignments(OLD.assignments))
    LOOP
        IF (old_elem->>'volunteerId')::uuid = current_user_id THEN
            old_user_assignment := old_elem;
        ELSIF (old_elem->>'teamId')::uuid IS NOT NULL AND current_user_id = ANY((SELECT member_ids FROM public.teams WHERE id = (old_elem->>'teamId')::uuid)) THEN
            old_user_assignment := old_elem;
        ELSE
            old_other_assignments := old_other_assignments || old_elem;
        END IF;
    END LOOP;

    FOR new_elem IN SELECT * FROM jsonb_array_elements(get_service_volunteer_assignments(NEW.assignments))
    LOOP
        IF (new_elem->>'volunteerId')::uuid = current_user_id THEN
            new_user_assignment := new_elem;
        ELSIF (new_elem->>'teamId')::uuid IS NOT NULL AND current_user_id = ANY((SELECT member_ids FROM public.teams WHERE id = (new_elem->>'teamId')::uuid)) THEN
            new_user_assignment := new_elem;
        ELSE
            new_other_assignments := new_other_assignments || new_elem;
        END IF;
    END LOOP;

    IF old_user_assignment IS NOT NULL AND new_user_assignment IS NULL THEN
        RAISE EXCEPTION 'Ação negada: Voluntários não podem se remover da escala.';
    END IF;
    
    IF (SELECT jsonb_agg(elem ORDER BY (elem->>'role'), (elem->>'volunteerId'), (elem->>'teamId')) FROM jsonb_array_elements(old_other_assignments) AS elem)
       IS DISTINCT FROM
       (SELECT jsonb_agg(elem ORDER BY (elem->>'role'), (elem->>'volunteerId'), (elem->>'teamId')) FROM jsonb_array_elements(new_other_assignments) AS elem)
    THEN
        RAISE EXCEPTION 'Ação negada: Voluntários não podem modificar atribuições de outras pessoas ou equipes.';
    END IF;

    IF (old_user_assignment - '{status,declineReason}'::text[])
       IS DISTINCT FROM
       (new_user_assignment - '{status,declineReason}'::text[])
    THEN
        RAISE EXCEPTION 'Ação negada: Você só pode atualizar o status ou motivo de recusa da sua própria atribuição.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION delete_service_if_allowed(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_volunteer record;
  v_service record;
  v_assign record;
  v_allowed boolean := true;
  v_leader_ministry_ids uuid[];
  v_assign_ministries jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT * INTO v_volunteer
  FROM volunteers
  WHERE auth_user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil do usuario nao encontrado';
  END IF;

  SELECT * INTO v_service
  FROM services
  WHERE id_uuid = p_service_id
    AND organization_id = v_volunteer.organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escala nao encontrada ou fora da organizacao';
  END IF;

  IF v_volunteer.access_level = 'admin' THEN
    DELETE FROM services WHERE id_uuid = p_service_id;
    RETURN;
  END IF;

  IF v_volunteer.access_level <> 'leader' THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;

  IF jsonb_array_length(get_service_volunteer_assignments(v_service.assignments)) = 0 THEN
    DELETE FROM services WHERE id_uuid = p_service_id;
    RETURN;
  END IF;

  SELECT array_agg((ma->>'ministryId')::uuid)
    INTO v_leader_ministry_ids
  FROM jsonb_array_elements(coalesce(v_volunteer.ministry_assignments, '[]'::jsonb)) ma
  WHERE coalesce((ma->>'isLeader')::boolean, false) = true;

  IF v_leader_ministry_ids IS NULL OR array_length(v_leader_ministry_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Permissao negada para excluir esta escala';
  END IF;

  FOR v_assign IN
    SELECT jsonb_array_elements(get_service_volunteer_assignments(v_service.assignments)) AS item
  LOOP
    SELECT ministry_assignments
      INTO v_assign_ministries
    FROM volunteers
    WHERE id = (v_assign.item->>'volunteerId')::uuid;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(coalesce(v_assign_ministries, '[]'::jsonb)) mas
      WHERE (mas->>'ministryId')::uuid = ANY (v_leader_ministry_ids)
    ) THEN
      v_allowed := false;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Permissao negada para excluir esta escala';
  END IF;

  DELETE FROM services WHERE id_uuid = p_service_id;
END;
$$;

CREATE OR REPLACE FUNCTION notify_leader_assignment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_item jsonb;
  new_item jsonb;
  payload jsonb;
BEGIN
  IF OLD.assignments = NEW.assignments THEN
    RETURN NEW;
  END IF;

  FOR new_item IN
    SELECT * FROM jsonb_array_elements(get_service_volunteer_assignments(NEW.assignments))
  LOOP
    SELECT old_elem
    INTO old_item
    FROM jsonb_array_elements(get_service_volunteer_assignments(OLD.assignments)) AS old_elem
    WHERE old_elem->>'volunteerId' = new_item->>'volunteerId'
    LIMIT 1;

    IF old_item IS NULL THEN
      CONTINUE;
    END IF;

    IF old_item->>'status' = new_item->>'status' THEN
      CONTINUE;
    END IF;

    IF new_item->>'status' NOT IN ('confirmed', 'declined') THEN
      CONTINUE;
    END IF;

    payload := jsonb_build_object(
      'service_id', NEW.id,
      'volunteer_id', new_item->>'volunteerId',
      'status', new_item->>'status',
      'changed_at', now()
    );

    PERFORM
      http_post(
        'https://n8n.seventech.cloud/webhook/notify-leader',
        payload::text,
        'application/json'
      );
  END LOOP;

  RETURN NEW;
END;
$$;

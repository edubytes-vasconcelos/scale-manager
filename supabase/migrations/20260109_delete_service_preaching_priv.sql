-- Allow users with can_manage_preaching_schedule to delete services via RPC

CREATE OR REPLACE FUNCTION delete_service_if_allowed(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Admins can always delete
  IF v_volunteer.access_level = 'admin' THEN
    DELETE FROM services WHERE id_uuid = p_service_id;
    RETURN;
  END IF;

  -- Users with preaching schedule permission can delete
  IF COALESCE(v_volunteer.can_manage_preaching_schedule, false) = true THEN
    DELETE FROM services WHERE id_uuid = p_service_id;
    RETURN;
  END IF;

  -- Leaders can delete only if all assignments are in their ministries
  IF v_volunteer.access_level <> 'leader' THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;

  IF jsonb_array_length(coalesce(v_service.assignments, '[]'::jsonb)) = 0 THEN
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
    SELECT jsonb_array_elements(coalesce(v_service.assignments, '[]'::jsonb)) AS item
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

GRANT EXECUTE ON FUNCTION delete_service_if_allowed(uuid) TO authenticated;

-- Fix RLS recursion on volunteers update by using access context instead of self-joins

CREATE OR REPLACE FUNCTION can_manage_volunteers_ctx(
  p_org_id uuid,
  p_target_ministry_assignments jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM volunteer_access_context ctx
    WHERE ctx.auth_user_id = auth.uid()
      AND ctx.organization_id = p_org_id
      AND (
        ctx.access_level = 'admin'
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(ctx.ministry_assignments, '[]'::jsonb)) lma
          JOIN jsonb_array_elements(COALESCE(p_target_ministry_assignments, '[]'::jsonb)) vma
            ON (lma.value ->> 'ministryId') = (vma.value ->> 'ministryId')
          WHERE COALESCE((lma.value ->> 'isLeader')::boolean, false) = true
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION can_manage_volunteers_ctx(uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS volunteers_update_manage ON volunteers;
DROP POLICY IF EXISTS volunteers_self_update ON volunteers;

CREATE POLICY volunteers_update_manage
  ON volunteers
  FOR UPDATE
  USING (can_manage_volunteers_ctx(organization_id, ministry_assignments))
  WITH CHECK (can_manage_volunteers_ctx(organization_id, ministry_assignments));

CREATE POLICY volunteers_self_update
  ON volunteers
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Volunteer unavailability (full day ranges)

CREATE TABLE IF NOT EXISTS volunteer_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_unavailability_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS volunteer_unavailability_org_volunteer_dates
  ON volunteer_unavailability (organization_id, volunteer_id, start_date, end_date);

CREATE OR REPLACE FUNCTION can_manage_unavailability(
  p_org_id uuid,
  p_volunteer_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH me AS (
    SELECT *
    FROM volunteers
    WHERE auth_user_id = auth.uid()
      AND organization_id = p_org_id
    LIMIT 1
  ),
  target AS (
    SELECT *
    FROM volunteers
    WHERE id = p_volunteer_id
      AND organization_id = p_org_id
    LIMIT 1
  )
  SELECT EXISTS (
    SELECT 1
    FROM me m
    JOIN target t ON true
    WHERE
      m.access_level = 'admin'
      OR m.id = t.id
      OR (
        m.access_level = 'leader'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(m.ministry_assignments, '[]'::jsonb)) lm
          JOIN jsonb_array_elements(COALESCE(t.ministry_assignments, '[]'::jsonb)) tm
            ON (lm.value ->> 'ministryId') = (tm.value ->> 'ministryId')
          WHERE COALESCE((lm.value ->> 'isLeader')::boolean, false) = true
        )
      )
  );
$$;

ALTER TABLE volunteer_unavailability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS volunteer_unavailability_select ON volunteer_unavailability;
CREATE POLICY volunteer_unavailability_select
  ON volunteer_unavailability
  FOR SELECT
  USING (is_member_of_org(organization_id));

DROP POLICY IF EXISTS volunteer_unavailability_insert ON volunteer_unavailability;
CREATE POLICY volunteer_unavailability_insert
  ON volunteer_unavailability
  FOR INSERT
  WITH CHECK (can_manage_unavailability(organization_id, volunteer_id));

DROP POLICY IF EXISTS volunteer_unavailability_update ON volunteer_unavailability;
CREATE POLICY volunteer_unavailability_update
  ON volunteer_unavailability
  FOR UPDATE
  USING (can_manage_unavailability(organization_id, volunteer_id))
  WITH CHECK (can_manage_unavailability(organization_id, volunteer_id));

DROP POLICY IF EXISTS volunteer_unavailability_delete ON volunteer_unavailability;
CREATE POLICY volunteer_unavailability_delete
  ON volunteer_unavailability
  FOR DELETE
  USING (can_manage_unavailability(organization_id, volunteer_id));

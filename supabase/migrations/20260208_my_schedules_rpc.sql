-- RPC: get_my_schedules
-- Returns future services where the given volunteer is assigned,
-- filtering inside the JSONB assignments column on the database side
-- instead of fetching all services and filtering in JavaScript.
CREATE OR REPLACE FUNCTION get_my_schedules(
  p_volunteer_id uuid,
  p_organization_id uuid
)
RETURNS SETOF services
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT s.*
  FROM services s
  WHERE s.organization_id = p_organization_id
    AND s.date >= to_char(now(), 'YYYY-MM-DD')
    AND (
      -- New format: { volunteers: [...], preachers: [...] }
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(s.assignments -> 'volunteers') AS vol
        WHERE vol ->> 'volunteerId' = p_volunteer_id::text
      )
      OR
      -- Legacy format: assignments is a plain array of ServiceAssignment
      (
        jsonb_typeof(s.assignments) = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(s.assignments) AS vol
          WHERE vol ->> 'volunteerId' = p_volunteer_id::text
        )
      )
    )
  ORDER BY s.date ASC;
$$;

GRANT EXECUTE ON FUNCTION get_my_schedules(uuid, uuid) TO authenticated;

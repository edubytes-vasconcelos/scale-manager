-- Allow users who can manage preaching schedule to create/update event types

DROP POLICY IF EXISTS insert_event_types ON event_types;
CREATE POLICY insert_event_types
  ON event_types
  FOR INSERT
  WITH CHECK (
    is_admin_of_org(organization_id)
    OR can_manage_preaching_schedule(organization_id)
  );

DROP POLICY IF EXISTS update_event_types ON event_types;
CREATE POLICY update_event_types
  ON event_types
  FOR UPDATE
  USING (
    is_admin_of_org(organization_id)
    OR can_manage_preaching_schedule(organization_id)
  )
  WITH CHECK (
    is_admin_of_org(organization_id)
    OR can_manage_preaching_schedule(organization_id)
  );

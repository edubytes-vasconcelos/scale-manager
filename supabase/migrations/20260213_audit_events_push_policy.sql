drop policy if exists "audit_events_insert_push_self" on audit_events;

create policy "audit_events_insert_push_self"
  on audit_events
  for insert
  to authenticated
  with check (
    actor_auth_user_id = auth.uid()
    and action in ('push_enabled', 'push_disabled', 'push_test_sent')
    and entity_type = 'notification_settings'
    and exists (
      select 1
      from volunteers v
      where v.auth_user_id = auth.uid()
        and v.organization_id = organization_id
        and (
          actor_volunteer_id is null
          or v.id = actor_volunteer_id
        )
    )
  );

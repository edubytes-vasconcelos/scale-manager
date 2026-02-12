create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_auth_user_id uuid,
  actor_volunteer_id uuid references volunteers(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_org_created_idx
  on audit_events (organization_id, created_at desc);

create index if not exists audit_events_action_idx
  on audit_events (action);

alter table audit_events enable row level security;

drop policy if exists "audit_events_insert_manager" on audit_events;
create policy "audit_events_insert_manager"
  on audit_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from volunteers v
      where v.auth_user_id = auth.uid()
        and v.organization_id = organization_id
        and (
          v.access_level in ('admin', 'leader')
          or coalesce(v.can_manage_preaching_schedule, false) = true
        )
    )
  );

drop policy if exists "audit_events_select_manager" on audit_events;
create policy "audit_events_select_manager"
  on audit_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from volunteers v
      where v.auth_user_id = auth.uid()
        and v.organization_id = organization_id
        and v.access_level in ('admin', 'leader')
    )
  );

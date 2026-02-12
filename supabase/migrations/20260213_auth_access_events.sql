create table if not exists auth_access_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_auth_user_id uuid not null,
  actor_volunteer_id uuid references volunteers(id) on delete set null,
  event text not null check (event in ('login', 'logout')),
  app_platform text not null default 'web',
  device_type text not null default 'desktop',
  os text,
  browser text,
  user_agent text,
  language text,
  timezone text,
  screen text,
  viewport text,
  path text,
  referrer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_access_events_org_created_idx
  on auth_access_events (organization_id, created_at desc);

create index if not exists auth_access_events_event_idx
  on auth_access_events (event);

alter table auth_access_events enable row level security;

drop policy if exists "auth_access_events_insert_self_org" on auth_access_events;
create policy "auth_access_events_insert_self_org"
  on auth_access_events
  for insert
  to authenticated
  with check (
    actor_auth_user_id = auth.uid()
    and exists (
      select 1
      from volunteers v
      where v.auth_user_id = auth.uid()
        and v.organization_id = organization_id
    )
  );

drop policy if exists "auth_access_events_select_admin" on auth_access_events;
create policy "auth_access_events_select_admin"
  on auth_access_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from volunteers v
      where v.auth_user_id = auth.uid()
        and v.organization_id = organization_id
        and v.access_level = 'admin'
    )
  );

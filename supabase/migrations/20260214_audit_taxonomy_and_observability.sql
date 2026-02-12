create table if not exists audit_event_catalog (
  action text primary key,
  domain text not null,
  entity_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into audit_event_catalog (action, domain, entity_type, severity, description)
values
  ('auth.login', 'auth', 'session', 'info', 'Login no sistema'),
  ('auth.logout', 'auth', 'session', 'info', 'Logout no sistema'),
  ('notification.push.enabled', 'notification', 'notification_settings', 'info', 'Push habilitado no dispositivo'),
  ('notification.push.disabled', 'notification', 'notification_settings', 'info', 'Push desabilitado no dispositivo'),
  ('notification.push.test_sent', 'notification', 'notification_settings', 'info', 'Push de teste enviado'),
  ('notification.push.reminder.sent', 'notification', 'notification_delivery', 'info', 'Push de lembrete enviado'),
  ('notification.push.reminder.failed', 'notification', 'notification_delivery', 'error', 'Falha ao enviar push de lembrete'),
  ('schedule.create', 'schedule', 'service', 'info', 'Escala criada'),
  ('schedule.delete', 'schedule', 'service', 'warning', 'Escala excluida'),
  ('schedule.update', 'schedule', 'service', 'info', 'Escala atualizada'),
  ('schedule.assignment.add', 'schedule', 'service', 'info', 'Voluntario adicionado na escala'),
  ('schedule.assignment.remove', 'schedule', 'service', 'warning', 'Voluntario removido da escala'),
  ('schedule.preacher.add', 'schedule', 'service', 'info', 'Pregador adicionado na escala'),
  ('schedule.preacher.remove', 'schedule', 'service', 'warning', 'Pregador removido da escala'),
  ('schedule.preacher.update', 'schedule', 'service', 'info', 'Pregador atualizado na escala'),
  ('schedule.autoschedule.apply', 'schedule', 'service', 'info', 'Autoescala aplicada'),
  ('schedule.rsvp.confirm', 'schedule', 'service', 'info', 'Presenca confirmada via RSVP'),
  ('schedule.rsvp.decline', 'schedule', 'service', 'warning', 'Presenca recusada via RSVP'),
  ('volunteer.create', 'volunteer', 'volunteer', 'info', 'Voluntario criado'),
  ('volunteer.update', 'volunteer', 'volunteer', 'info', 'Voluntario atualizado'),
  ('volunteer.delete', 'volunteer', 'volunteer', 'warning', 'Voluntario excluido'),
  ('volunteer.unavailability.create', 'volunteer', 'volunteer', 'info', 'Indisponibilidade criada'),
  ('volunteer.unavailability.delete', 'volunteer', 'volunteer_unavailability', 'warning', 'Indisponibilidade removida'),
  ('system.error', 'system', 'system', 'error', 'Erro de operacao no cliente/fluxo')
on conflict (action) do update
set
  domain = excluded.domain,
  entity_type = excluded.entity_type,
  severity = excluded.severity,
  description = excluded.description,
  active = true;

update audit_events set action = 'notification.push.enabled' where action = 'push_enabled';
update audit_events set action = 'notification.push.disabled' where action = 'push_disabled';
update audit_events set action = 'notification.push.test_sent' where action = 'push_test_sent';

alter table audit_events
  drop constraint if exists audit_events_action_fk;

alter table audit_events
  add constraint audit_events_action_fk
  foreign key (action)
  references audit_event_catalog(action);

drop policy if exists "audit_events_insert_push_self" on audit_events;

create policy "audit_events_insert_self_member"
  on audit_events
  for insert
  to authenticated
  with check (
    actor_auth_user_id = auth.uid()
    and action in (
      'auth.login',
      'auth.logout',
      'notification.push.enabled',
      'notification.push.disabled',
      'notification.push.test_sent',
      'schedule.rsvp.confirm',
      'schedule.rsvp.decline',
      'system.error'
    )
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

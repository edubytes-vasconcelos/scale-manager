import { supabase } from "@/lib/supabase";

type AuditPayload = {
  organizationId: string;
  actorVolunteerId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function auditEvent(payload: AuditPayload) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const actorAuthUserId = authData?.user?.id ?? null;

    const { error } = await supabase.from("audit_events").insert({
      organization_id: payload.organizationId,
      actor_auth_user_id: actorAuthUserId,
      actor_volunteer_id: payload.actorVolunteerId ?? null,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      metadata: payload.metadata ?? {},
    });

    if (error) {
      console.warn("audit_event_insert_failed", payload.action, error.message);
    }
  } catch (error) {
    console.warn("audit_event_unexpected_error", payload.action, error);
  }
}

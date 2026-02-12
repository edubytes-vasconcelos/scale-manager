import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type AuditEventRow = {
  id: string;
  organization_id: string;
  actor_auth_user_id: string | null;
  actor_volunteer_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function useAuditEvents(organizationId: string | null | undefined, limit = 2000) {
  return useQuery({
    queryKey: ["audit-events", organizationId, limit],
    queryFn: async () => {
      if (!organizationId) return [] as AuditEventRow[];

      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as AuditEventRow[];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}


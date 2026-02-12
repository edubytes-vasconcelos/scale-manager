import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type AuthAccessEventRow = {
  id: string;
  organization_id: string;
  actor_auth_user_id: string;
  actor_volunteer_id: string | null;
  event: "login" | "logout";
  app_platform: string;
  device_type: string;
  os: string | null;
  browser: string | null;
  user_agent: string | null;
  language: string | null;
  timezone: string | null;
  screen: string | null;
  viewport: string | null;
  path: string | null;
  referrer: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function useAuthAccessEvents(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["auth-access-events", organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as AuthAccessEventRow[];

      const { data, error } = await supabase
        .from("auth_access_events")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;
      return (data || []) as AuthAccessEventRow[];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}

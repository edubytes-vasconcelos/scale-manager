import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { mapEventType } from "@/lib/mappers";

export function useEventTypes(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["event_types", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("event_types")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data.map(mapEventType);
    },
    enabled: !!organizationId,
  });
}

export function useCreateEventType() {
  return useMutation({
    mutationFn: async (eventType: {
      name: string;
      color?: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("event_types")
        .insert({
          id: crypto.randomUUID(),
          name: eventType.name,
          color: eventType.color || null,
          organization_id: eventType.organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event_types", variables.organizationId] });
    },
  });
}

export function useUpdateEventType() {
  return useMutation({
    mutationFn: async (eventType: {
      id: string;
      name: string;
      color?: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("event_types")
        .update({
          name: eventType.name,
          color: eventType.color || null,
        })
        .eq("id", eventType.id)
        .eq("organization_id", eventType.organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event_types", variables.organizationId] });
    },
  });
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import type { Preacher } from "@shared/schema";
import { mapService, mapPreacher } from "@/lib/mappers";

export function useServices(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["services", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .order("date", { ascending: true });

      if (error) throw error;
      return (data || []).map(mapService);
    },
    enabled: !!organizationId,
    refetchOnWindowFocus: true,
  });
}

export function useMySchedules(volunteerId: string | null | undefined, organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["my-schedules", volunteerId, organizationId],
    queryFn: async () => {
      if (!volunteerId || !organizationId) return [];

      const { data, error } = await supabase.rpc("get_my_schedules", {
        p_volunteer_id: volunteerId,
        p_organization_id: organizationId,
      });

      if (error) throw error;

      return ((data || []) as any[]).map(mapService);
    },
    enabled: !!volunteerId && !!organizationId,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateAssignmentStatus() {
  return useMutation({
    mutationFn: async ({
      serviceId,
      volunteerId,
      organizationId,
      status,
      note
    }: {
      serviceId: string;
      volunteerId: string;
      organizationId: string;
      status: "confirmed" | "declined" | "pending";
      note?: string;
    }) => {
      const { error } = await supabase.rpc("update_service_assignment_status", {
        p_service_id: serviceId,
        p_volunteer_id: volunteerId,
        p_status: status,
        p_note: note ?? null,
      });

      if (error) throw error;

      return { serviceId, volunteerId, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services", data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["my-schedules", data.volunteerId, data.organizationId] });
    },
  });
}

export function usePreachers(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["preachers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("preachers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (error) throw error;

      return data.map(mapPreacher);
    },
    enabled: !!organizationId,
  });
}

export function useUpsertPreacher() {
  return useMutation({
    mutationFn: async (payload: {
      organizationId: string;
      name: string;
      type?: "interno" | "convidado";
      church?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("upsert_preacher", {
        p_organization_id: payload.organizationId,
        p_name: payload.name,
        p_type: payload.type ?? "interno",
        p_church: payload.church || null,
        p_notes: payload.notes || null,
      });

      if (error) throw error;
      return data as Preacher;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["preachers", variables.organizationId] });
    },
  });
}

export function useUpdatePreacher() {
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      organizationId: string;
      name: string;
      type?: "interno" | "convidado";
      church?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("preachers")
        .update({
          name: payload.name,
          type: payload.type ?? "interno",
          church: payload.church || null,
          notes: payload.notes || null,
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data as Preacher;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["preachers", variables.organizationId] });
    },
  });
}

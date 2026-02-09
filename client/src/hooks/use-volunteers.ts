import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import type { VolunteerUnavailability } from "@shared/schema";
import {
  mapVolunteerWithOrg,
  mapVolunteer,
  mapVolunteerUnavailability,
} from "@/lib/mappers";

export function useVolunteerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["volunteer", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("volunteers")
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq("auth_user_id", user.id)
        .order("organization_id", { ascending: false, nullsFirst: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const first = Array.isArray(data) ? data[0] : data;
      if (!first) return null;

      return mapVolunteerWithOrg(first);
    },
    enabled: !!user,
  });
}

export function useVolunteers(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["volunteers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("volunteers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (error) throw error;

      return data.map(mapVolunteer);
    },
    enabled: !!organizationId,
  });
}

export function useCreateVolunteer() {
  return useMutation({
    mutationFn: async (volunteer: {
      name: string;
      email?: string;
      accessLevel?: string;
      organizationId: string;
      canManagePreachingSchedule?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("volunteers")
        .insert({
          id: crypto.randomUUID(),
          name: volunteer.name,
          email: volunteer.email || null,
          access_level: volunteer.accessLevel || "volunteer",
          organization_id: volunteer.organizationId,
          can_manage_preaching_schedule: volunteer.canManagePreachingSchedule ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["volunteers", variables.organizationId] });
    },
  });
}

export function useVolunteerUnavailability(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["volunteer_unavailability", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("volunteer_unavailability")
        .select("*")
        .eq("organization_id", organizationId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return (data || []).map(mapVolunteerUnavailability);
    },
    enabled: !!organizationId,
  });
}

export function useCreateVolunteerUnavailability() {
  return useMutation({
    mutationFn: async (payload: {
      organizationId: string;
      volunteerId: string;
      startDate: string;
      endDate: string;
      reason?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("volunteer_unavailability")
        .insert({
          id: crypto.randomUUID(),
          organization_id: payload.organizationId,
          volunteer_id: payload.volunteerId,
          start_date: payload.startDate,
          end_date: payload.endDate,
          reason: payload.reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["volunteer_unavailability", variables.organizationId],
      });
    },
  });
}

export function useDeleteVolunteerUnavailability() {
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from("volunteer_unavailability")
        .delete()
        .eq("id", payload.id)
        .eq("organization_id", payload.organizationId);

      if (error) throw error;
      return true;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["volunteer_unavailability", variables.organizationId],
      });
    },
  });
}

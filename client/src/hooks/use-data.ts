import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import type { Service, VolunteerWithOrg, Volunteer, Ministry, Team, EventType } from "@shared/schema";

export function useVolunteerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["volunteer", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Fetch volunteer with organization name via join
      const { data, error } = await supabase
        .from("volunteers")
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq("auth_user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      // Map snake_case from Supabase to camelCase for TypeScript
      return {
        id: data.id,
        authUserId: data.auth_user_id,
        organizationId: data.organization_id,
        accessLevel: data.access_level,
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        acceptsNotifications: data.accepts_notifications,
        ministryAssignments: data.ministry_assignments,
        createdAt: data.created_at,
        organization: data.organization,
      } as VolunteerWithOrg;
    },
    enabled: !!user,
  });
}

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
      return data as Service[];
    },
    enabled: !!organizationId,
  });
}

export function useMySchedules(volunteerId: string | null | undefined, organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["my-schedules", volunteerId, organizationId],
    queryFn: async () => {
      if (!volunteerId || !organizationId) return [];
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("date", new Date().toISOString().split('T')[0])
        .order("date", { ascending: true });

      if (error) throw error;
      
      const services = data as Service[];
      
      return services.filter(service => {
        if (!service.assignments || !Array.isArray(service.assignments)) return false;
        return service.assignments.some((assignment: any) => 
          assignment.volunteerId === volunteerId
        );
      });
    },
    enabled: !!volunteerId && !!organizationId,
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
      
      return data.map((v: any) => ({
        id: v.id,
        authUserId: v.auth_user_id,
        organizationId: v.organization_id,
        accessLevel: v.access_level,
        name: v.name,
        email: v.email,
        whatsapp: v.whatsapp,
        acceptsNotifications: v.accepts_notifications,
        ministryAssignments: v.ministry_assignments,
        createdAt: v.created_at,
      })) as Volunteer[];
    },
    enabled: !!organizationId,
  });
}

export function useMinistries(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["ministries", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("ministries")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Ministry[];
    },
    enabled: !!organizationId,
  });
}

export function useTeams(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["teams", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true });

      if (error) throw error;
      
      return data.map((t: any) => ({
        id: t.id,
        organizationId: t.organization_id,
        name: t.name,
        memberIds: t.member_ids || [],
      })) as Team[];
    },
    enabled: !!organizationId,
  });
}

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
      return data as EventType[];
    },
    enabled: !!organizationId,
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
      const { data: service, error: fetchError } = await supabase
        .from("services")
        .select("assignments")
        .eq("id", serviceId)
        .single();

      if (fetchError) throw fetchError;

      const assignments = (service.assignments || []) as any[];
      const updatedAssignments = assignments.map((a: any) => {
        if (a.volunteerId === volunteerId) {
          const updated: any = { ...a, status };
          if (note) {
            updated.note = note;
          } else if (status !== "declined") {
            delete updated.note;
          }
          return updated;
        }
        return a;
      });

      const { error: updateError } = await supabase
        .from("services")
        .update({ assignments: updatedAssignments })
        .eq("id", serviceId);

      if (updateError) throw updateError;
      
      return { serviceId, volunteerId, organizationId, updatedAssignments };
    },
    onSuccess: (data) => {
      // Invalidate with exact keys to ensure proper cache refresh
      queryClient.invalidateQueries({ queryKey: ["services", data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["my-schedules", data.volunteerId, data.organizationId] });
    },
  });
}

export function useCreateVolunteer() {
  return useMutation({
    mutationFn: async (volunteer: {
      name: string;
      email?: string;
      accessLevel?: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("volunteers")
        .insert({
          id: crypto.randomUUID(),
          name: volunteer.name,
          email: volunteer.email || null,
          access_level: volunteer.accessLevel || "volunteer",
          organization_id: volunteer.organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
    },
  });
}

export function useCreateMinistry() {
  return useMutation({
    mutationFn: async (ministry: {
      name: string;
      icon?: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("ministries")
        .insert({
          id: crypto.randomUUID(),
          name: ministry.name,
          icon: ministry.icon || null,
          organization_id: ministry.organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_types"] });
    },
  });
}

export function useCreateTeam() {
  return useMutation({
    mutationFn: async (team: {
      name: string;
      memberIds: string[];
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({
          id: crypto.randomUUID(),
          name: team.name,
          member_ids: team.memberIds,
          organization_id: team.organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useUpdateTeam() {
  return useMutation({
    mutationFn: async (team: {
      id: string;
      name: string;
      memberIds: string[];
    }) => {
      const { data, error } = await supabase
        .from("teams")
        .update({
          name: team.name,
          member_ids: team.memberIds,
        })
        .eq("id", team.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteTeam() {
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

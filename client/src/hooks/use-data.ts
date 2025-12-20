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

      return data as VolunteerWithOrg | null;
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
      return data as Volunteer[];
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
      return data as Team[];
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
      status 
    }: { 
      serviceId: string; 
      volunteerId: string; 
      status: "confirmed" | "declined" | "pending";
    }) => {
      const { data: service, error: fetchError } = await supabase
        .from("services")
        .select("assignments")
        .eq("id", serviceId)
        .single();

      if (fetchError) throw fetchError;

      const assignments = (service.assignments || []) as any[];
      const updatedAssignments = assignments.map((a: any) => 
        a.volunteerId === volunteerId ? { ...a, status } : a
      );

      const { error: updateError } = await supabase
        .from("services")
        .update({ assignments: updatedAssignments })
        .eq("id", serviceId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["my-schedules"] });
    },
  });
}

export function useCreateVolunteer() {
  return useMutation({
    mutationFn: async (volunteer: {
      name: string;
      email?: string;
      phone?: string;
      accessLevel?: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("volunteers")
        .insert({
          name: volunteer.name,
          email: volunteer.email || null,
          phone: volunteer.phone || null,
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
      icon?: string;
      color?: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("event_types")
        .insert({
          name: eventType.name,
          icon: eventType.icon || null,
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

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Service, VolunteerWithOrg } from "@shared/schema";

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

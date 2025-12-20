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

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
  });
}

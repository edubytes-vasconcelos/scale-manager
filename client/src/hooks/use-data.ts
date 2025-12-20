import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Volunteer, Service } from "@shared/schema";

export function useVolunteerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["volunteer", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("volunteers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
        throw error;
      }

      return data as Volunteer | null;
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

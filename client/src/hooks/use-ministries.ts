import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { mapMinistry } from "@/lib/mappers";

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
      return (data || []).map(mapMinistry);
    },
    enabled: !!organizationId,
  });
}

export function useCreateMinistry() {
  return useMutation({
    mutationFn: async (ministry: {
      name: string;
      icon?: string;
      whatsappGroupLink?: string | null;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("ministries")
        .insert({
          id: crypto.randomUUID(),
          name: ministry.name,
          icon: ministry.icon || null,
          whatsapp_group_link: ministry.whatsappGroupLink || null,
          organization_id: ministry.organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ministries", variables.organizationId] });
    },
  });
}

export function useUpdateMinistry() {
  return useMutation({
    mutationFn: async (ministry: {
      id: string;
      name: string;
      icon?: string;
      whatsappGroupLink?: string | null;
      organizationId: string;
    }) => {
      const { data, error } = await supabase
        .from("ministries")
        .update({
          name: ministry.name,
          icon: ministry.icon || null,
          whatsapp_group_link: ministry.whatsappGroupLink || null,
        })
        .eq("id", ministry.id)
        .eq("organization_id", ministry.organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ministries", variables.organizationId] });
    },
  });
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { mapTeam } from "@/lib/mappers";

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

      return data.map(mapTeam);
    },
    enabled: !!organizationId,
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.organizationId] });
    },
  });
}

export function useUpdateTeam() {
  return useMutation({
    mutationFn: async (team: {
      id: string;
      name: string;
      memberIds: string[];
      organizationId: string;
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.organizationId] });
    },
  });
}

export function useDeleteTeam() {
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", payload.id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", variables.organizationId] });
    },
  });
}

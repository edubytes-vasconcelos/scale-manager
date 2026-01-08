import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import type { Service, VolunteerWithOrg, Volunteer, Ministry, Team, EventType, ChatMessage, ChatMessageWithSender } from "@shared/schema";

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
      const localDate = new Date().toLocaleDateString("en-CA");
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("date", localDate)
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
        ministryAssignments: Array.isArray(v.ministry_assignments)
          ? v.ministry_assignments
          : [],
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

// Chat hooks for real-time messaging

export function useChatMessages(volunteerId: string | null | undefined, organizationId: string | null | undefined, isAdmin: boolean = false) {
  const query = useQuery({
    queryKey: ["chat-messages", volunteerId, organizationId, isAdmin],
    queryFn: async () => {
      if (!volunteerId || !organizationId) return [];
      
      let queryBuilder = supabase
        .from("chat_messages")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });
      
      // If not admin, only show messages where user is sender or receiver
      if (!isAdmin) {
        queryBuilder = queryBuilder.or(`sender_id.eq.${volunteerId},receiver_id.eq.${volunteerId},receiver_id.is.null`);
      }
      
      const { data, error } = await queryBuilder;

      if (error) throw error;
      
      return data.map((m: any) => ({
        id: m.id,
        organizationId: m.organization_id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        isFromAdmin: m.is_from_admin,
        readAt: m.read_at,
        createdAt: m.created_at,
      })) as ChatMessage[];
    },
    enabled: !!volunteerId && !!organizationId,
    refetchInterval: 5000, // Poll every 5 seconds as fallback
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!volunteerId || !organizationId) return;

    const channel = supabase
      .channel(`chat-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", volunteerId, organizationId, isAdmin] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [volunteerId, organizationId, isAdmin]);

  return query;
}

export function useChatConversations(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["chat-conversations", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // Get all messages to build conversation list
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          sender_id,
          receiver_id,
          created_at,
          content,
          is_from_admin
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by volunteer (either sender if not admin, or receiver if from admin)
      const conversations = new Map<string, { senderId: string; lastMessage: string; lastMessageAt: string }>();
      
      data.forEach((m: any) => {
        const volunteerId = m.is_from_admin === "true" ? m.receiver_id : m.sender_id;
        if (!volunteerId) return;
        
        if (!conversations.has(volunteerId)) {
          conversations.set(volunteerId, {
            senderId: volunteerId,
            lastMessage: m.content,
            lastMessageAt: m.created_at,
          });
        }
      });

      return Array.from(conversations.values());
    },
    enabled: !!organizationId,
  });
}

export function useSendChatMessage() {
  return useMutation({
    mutationFn: async (message: {
      organizationId: string;
      senderId: string;
      receiverId?: string | null;
      content: string;
      isFromAdmin?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          id: crypto.randomUUID(),
          organization_id: message.organizationId,
          sender_id: message.senderId,
          receiver_id: message.receiverId || null,
          content: message.content,
          is_from_admin: message.isFromAdmin ? "true" : "false",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations", variables.organizationId] });
    },
  });
}

export function useUnreadMessageCount(volunteerId: string | null | undefined, organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["unread-messages", volunteerId, organizationId],
    queryFn: async () => {
      if (!volunteerId || !organizationId) return 0;
      
      const { count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("receiver_id", volunteerId)
        .is("read_at", null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!volunteerId && !!organizationId,
    refetchInterval: 10000,
  });
}

export function useMarkMessagesAsRead() {
  return useMutation({
    mutationFn: async ({ volunteerId, organizationId }: { volunteerId: string; organizationId: string }) => {
      const { error } = await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("receiver_id", volunteerId)
        .is("read_at", null);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["unread-messages", variables.volunteerId, variables.organizationId] });
    },
  });
}

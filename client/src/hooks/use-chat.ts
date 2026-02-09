import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { mapChatMessage } from "@/lib/mappers";

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

      return data.map(mapChatMessage);
    },
    enabled: !!volunteerId && !!organizationId,
    refetchInterval: 60_000, // Fallback – real-time subscription handles instant updates
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
    refetchInterval: 60_000,
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

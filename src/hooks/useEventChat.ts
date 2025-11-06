import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  message_type: string;
  attachment_url?: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface TypingUser {
  user_id: string;
  full_name: string;
}

export const useEventChat = (eventId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    fetchMessages();
    setupRealtimeSubscription();

    return () => {
      channel?.unsubscribe();
    };
  }, [eventId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("event_messages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((m) => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      
      const messagesWithProfiles = data?.map((msg) => ({
        ...msg,
        profiles: profilesMap.get(msg.user_id),
      })) || [];

      setMessages(messagesWithProfiles as Message[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const newChannel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", payload.new.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...payload.new, profiles: profile } as Message,
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", payload.new.user_id)
              .single();

            setTypingUsers((prev) => {
              const filtered = prev.filter((u) => u.user_id !== payload.new.user_id);
              return [...filtered, { user_id: payload.new.user_id, full_name: profile?.full_name || "" }];
            });

            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.new.user_id));
            }, 3000);
          }
        }
      )
      .subscribe();

    setChannel(newChannel);
  };

  const sendMessage = async (content: string, mentions?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("event_messages").insert({
        event_id: eventId,
        user_id: user.id,
        content,
        mentions: mentions || [],
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const updateTypingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("typing_indicators").upsert({
        event_id: eventId,
        user_id: user.id,
        last_typed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  return {
    messages,
    typingUsers,
    loading,
    sendMessage,
    updateTypingStatus,
  };
};

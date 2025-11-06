import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  sender_name: string;
}

export const useCommunityChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    
    const channel = supabase
      .channel('community_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // fetch sender name safely; prefer profile.full_name only — fall back to 'Anonymous' (do not expose ids)
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('full_name')
            .eq('id', newMessage.user_id)
            .single();

          // Only use profile.full_name; do not expose ids or use fallbacks
          const senderName = profile?.full_name || '';

          setMessages(prev => [
            ...prev,
            {
              id: newMessage.id,
              content: newMessage.content,
              user_id: newMessage.user_id,
              created_at: newMessage.created_at,
              sender_name: senderName
            }
          ]);
        }
      )
      // listen for deletes so UI updates in realtime
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'community_messages'
        },
        (payload) => {
          const deleted = payload.old as any;
          if (deleted?.id) {
            setMessages(prev => prev.filter(m => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error } = await (supabase as any)
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

  const messagesArr = messagesData || [];
      const userIds = [...new Set(messagesArr.map((m: any) => m.user_id))];

      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds || []);

      const profilesArr = profiles || [];
      const profileMap = new Map(profilesArr.map((p: any) => [p.id, p.full_name]));

      const messagesWithSenders = messagesArr.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        user_id: msg.user_id,
        created_at: msg.created_at,
        // Only set sender_name when profile exists; otherwise leave empty string
        sender_name: profileMap.get(msg.user_id) || ''
      }));

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await (supabase as any)
        .from('community_messages')
        .insert([{ user_id: user.id, content }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };
  const deleteMessage = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await (supabase as any)
        .from('community_messages')
        .delete()
        .match({ id: messageId, user_id: user.id });

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };
  return { messages, loading, sendMessage, deleteMessage };
};
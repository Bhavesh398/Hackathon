import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  requester?: {
    full_name: string;
    college?: string;
  };
  receiver?: {
    full_name: string;
    college?: string;
  };
}

export const useConnections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnections();
    setupRealtimeSubscription();
  }, []);

  const fetchConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) throw error;

      // Fetch all related profiles
      const userIds = new Set<string>();
      data?.forEach((conn) => {
        userIds.add(conn.requester_id);
        userIds.add(conn.receiver_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, college")
        .in("id", Array.from(userIds));

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const connectionsWithProfiles = data?.map((conn) => ({
        ...conn,
        requester: profilesMap.get(conn.requester_id),
        receiver: profilesMap.get(conn.receiver_id),
      })) || [];

      const accepted = connectionsWithProfiles.filter((c) => c.status === "accepted");
      const pending = connectionsWithProfiles.filter((c) => c.status === "pending");

      setConnections(accepted as Connection[]);
      setPendingRequests(pending as Connection[]);
    } catch (error) {
      console.error("Error fetching connections:", error);
      toast({
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("connections-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
        },
        () => {
          fetchConnections();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const sendConnectionRequest = async (receiverId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("connections").insert({
        requester_id: user.id,
        receiver_id: receiverId,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connection request sent",
      });
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    }
  };

  const acceptConnectionRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", connectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connection request accepted",
      });
    } catch (error) {
      console.error("Error accepting connection:", error);
      toast({
        title: "Error",
        description: "Failed to accept connection request",
        variant: "destructive",
      });
    }
  };

  const rejectConnectionRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connection request rejected",
      });
    } catch (error) {
      console.error("Error rejecting connection:", error);
      toast({
        title: "Error",
        description: "Failed to reject connection request",
        variant: "destructive",
      });
    }
  };

  return {
    connections,
    pendingRequests,
    loading,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
  };
};

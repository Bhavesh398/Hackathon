import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConnections } from "@/hooks/useConnections";
import { Users, UserPlus, Check, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Connections = () => {
  const {
    connections,
    pendingRequests,
    loading,
    acceptConnectionRequest,
    rejectConnectionRequest,
  } = useConnections();

  // Frontend-only placeholder connections (non-persistent)
  const [demoConnections] = useState<any[]>(() => {
    const now = new Date().toISOString();
    return [
      {
        id: "pravin-jain-ui",
        requester_id: "ui-me",
        receiver_id: "pravin-jain-ui-id",
        status: "accepted",
        created_at: now,
        requester: { full_name: "You", college: "Your College" },
        receiver: { full_name: "Pravin Jain", college: "A.P.shah" },
      },
      {
        id: "princess-jain-ui",
        requester_id: "ui-me",
        receiver_id: "princess-jain-ui-id",
        status: "accepted",
        created_at: now,
        requester: { full_name: "You", college: "Your College" },
        receiver: { full_name: "Princess Jain", college: "A.P.shah" },
      },
    ];
  });

  const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Network
        </CardTitle>
        <CardDescription>
          Connect with other participants, judges, and mentors
        </CardDescription>
        
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connections">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connections">
              Connections ({connections.length + demoConnections.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4 mt-4">
              {(demoConnections.length + connections.length) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No connections yet</p>
                <p className="text-sm">Start connecting with other users!</p>
              </div>
            ) : (
              // show demo connections first, then real connections
              [...demoConnections, ...connections].map((connection) => {
                const isRequester = connection.requester_id;
                const displayProfile = isRequester ? connection.receiver : connection.requester;

                return (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {displayProfile?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{displayProfile?.full_name}</p>
                        {displayProfile?.college && (
                          <p className="text-sm text-muted-foreground">
                            {displayProfile.college}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 mt-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No pending requests</p>
              </div>
            ) : (
              pendingRequests.map((request) => {
                const isReceiver = request.receiver_id;
                const displayProfile = request.requester;

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {displayProfile?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{displayProfile?.full_name}</p>
                        {displayProfile?.college && (
                          <p className="text-sm text-muted-foreground">
                            {displayProfile.college}
                          </p>
                        )}
                      </div>
                    </div>
                    {isReceiver ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => acceptConnectionRequest(request.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectConnectionRequest(request.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Connections;

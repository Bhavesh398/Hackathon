import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Connections from "@/components/Connections";
import CollaborationPosts from "@/components/CollaborationPosts";
import CommunityChat from "@/components/CommunityChat";

const Networking = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Networking</h1>
          <p className="text-muted-foreground">
            Connect with participants, find collaborators, and grow your network
          </p>
        </div>

        <Tabs defaultValue="connections" className="space-y-4">
          <TabsList className="glass">
            <TabsTrigger value="connections">My Connections</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="community">Community Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="connections">
            <Connections />
          </TabsContent>

          <TabsContent value="opportunities">
            <CollaborationPosts />
          </TabsContent>

          <TabsContent value="community">
            <CommunityChat />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Networking;

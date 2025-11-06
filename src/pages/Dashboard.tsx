import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@supabase/supabase-js";
import { Calendar, Trophy, Upload, Award } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import AISaathi from "@/components/AISaathi";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [stats, setStats] = useState({
    registrations: 0,
    submissions: 0,
    certificates: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Get profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    setProfile(profileData);

    // Get roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
  setRoles((rolesData as any[] | undefined)?.map((r: any) => r.role) || []);

    // Get quick dashboard stats
    try {
      const { count: registrations } = await supabase
        .from("event_registrations")
        .select("id", { count: 'exact', head: true })
        .eq("user_id", session.user.id);

      const { count: submissions } = await supabase
        .from("submissions")
        .select("id", { count: 'exact', head: true })
        .eq("user_id", session.user.id);

      const { count: certificates } = await supabase
        .from("certificates")
        .select("id", { count: 'exact', head: true })
        .eq("user_id", session.user.id);

      const { count: upcomingEvents } = await supabase
        .from("events")
        .select("id", { count: 'exact', head: true })
        .gt("start_date", new Date().toISOString())
        .eq("status", "published");

      setStats({
        registrations: registrations || 0,
        submissions: submissions || 0,
        certificates: certificates || 0,
        upcomingEvents: upcomingEvents || 0,
      });
    } catch (e) {
      // ignore stat errors silently
      console.error("Failed to fetch dashboard stats", e);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-card to-background">
        <AppSidebar userRoles={roles} />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <Card className="mb-6 glass">
              <CardHeader className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>{(profile?.full_name || user?.user_metadata?.full_name || "U").slice(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{profile?.full_name || user?.user_metadata?.full_name || "User"}</CardTitle>
                  <CardDescription className="text-sm">{profile?.college || "Welcome to Innovex"}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3">
                    <CardHeader>
                      <CardTitle className="text-sm">Registrations</CardTitle>
                      <CardDescription className="text-2xl font-bold">{stats.registrations}</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="p-3">
                    <CardHeader>
                      <CardTitle className="text-sm">Submissions</CardTitle>
                      <CardDescription className="text-2xl font-bold">{stats.submissions}</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="p-3">
                    <CardHeader>
                      <CardTitle className="text-sm">Certificates</CardTitle>
                      <CardDescription className="text-2xl font-bold">{stats.certificates}</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="p-3">
                    <CardHeader>
                      <CardTitle className="text-sm">Upcoming Events</CardTitle>
                      <CardDescription className="text-2xl font-bold">{stats.upcomingEvents}</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.includes("admin") && (
                <Card className="card-hover glass">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Manage Events
                    </CardTitle>
                    <CardDescription>Create and manage hackathon events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full btn-hover">Go to Admin Panel</Button>
                  </CardContent>
                </Card>
              )}

              {roles.includes("judge") && (
                <Card className="card-hover glass" onClick={() => navigate("/judge-access")}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="mr-2 h-5 w-5" />
                      Judge Events
                    </CardTitle>
                    <CardDescription>Access events you're judging</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full btn-hover">Enter Judge Portal</Button>
                  </CardContent>
                </Card>
              )}

              <Card className="card-hover glass" onClick={() => navigate("/events")}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Browse Events
                  </CardTitle>
                  <CardDescription>Find and join hackathons</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full btn-hover" variant="secondary">Explore Events</Button>
                </CardContent>
              </Card>

              <Card className="card-hover glass" onClick={() => navigate("/submissions")}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5" />
                    My Submissions
                  </CardTitle>
                  <CardDescription>View and submit your projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full btn-hover" variant="secondary">View Submissions</Button>
                </CardContent>
              </Card>

              <Card className="card-hover glass">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="mr-2 h-5 w-5" />
                    My Certificates
                  </CardTitle>
                  <CardDescription>Download your achievement certificates</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full btn-hover" 
                    variant="secondary"
                    onClick={() => navigate("/certificates")}
                  >
                    View Certificates
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <ThemeToggle />
        <AISaathi />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
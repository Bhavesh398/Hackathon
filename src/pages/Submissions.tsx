import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Upload, Loader2, ExternalLink, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}

interface Submission {
  id: string;
  title: string;
  description: string;
  github_url?: string;
  demo_url?: string;
  submitted_at: string;
  event_id: string;
}

interface EventWithSubmission {
  event: Event;
  submission?: Submission;
  status: 'completed' | 'pending' | 'overdue';
  daysRemaining?: number;
}

const Submissions = () => {
  const [eventsWithSubmissions, setEventsWithSubmissions] = useState<EventWithSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      setRoles(rolesData?.map((r: any) => r.role) || []);

      // Fetch events the user has registered for
      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", session.user.id);

      if (regError) throw regError;

      if (!registrations || registrations.length === 0) {
        setLoading(false);
        return;
      }

      const eventIds = registrations.map((r: any) => r.event_id);

      // Fetch event details
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .in("id", eventIds)
        .order("end_date", { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch user submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", session.user.id)
        .in("event_id", eventIds);

      if (submissionsError) throw submissionsError;

      // Map submissions to events
      const submissionsMap = new Map((submissions || []).map((s: any) => [s.event_id, s]));

      const eventsWithStatus = (events || []).map((event: any) => {
        const submission = submissionsMap.get(event.id);
        const now = new Date();
        const endDate = new Date(event.end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'completed' | 'pending' | 'overdue';
        if (submission) {
          status = 'completed';
        } else if (daysRemaining < 0) {
          status = 'overdue';
        } else {
          status = 'pending';
        }

        return {
          event,
          submission,
          status,
          daysRemaining: daysRemaining > 0 ? daysRemaining : undefined,
        };
      });

      setEventsWithSubmissions(eventsWithStatus);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load your submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-card to-background">
        <AppSidebar userRoles={roles} />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">My Submissions</h1>
              <p className="text-muted-foreground">
                Track your hackathon submissions and deadlines
              </p>
            </div>

            {eventsWithSubmissions.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h2 className="text-2xl font-semibold mb-2">No Events Registered</h2>
                    <p className="text-muted-foreground mb-4">
                      You haven't registered for any hackathons yet.
                    </p>
                    <Button onClick={() => navigate("/events")}>
                      Browse Events
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{eventsWithSubmissions.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Submitted</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-500">
                        {eventsWithSubmissions.filter(e => e.status === 'completed').length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-500">
                        {eventsWithSubmissions.filter(e => e.status === 'pending').length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Events List */}
                <div className="space-y-4">
                  {eventsWithSubmissions.map(({ event, submission, status, daysRemaining }) => (
                    <Card key={event.id} className="glass card-hover">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CardTitle>{event.title}</CardTitle>
                              {getStatusBadge(status)}
                            </div>
                            <CardDescription className="line-clamp-2">
                              {event.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Deadline: {formatDate(event.end_date)}</span>
                          </div>
                          {daysRemaining !== undefined && status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className={daysRemaining <= 3 ? "text-orange-500 font-medium" : ""}>
                                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                              </span>
                            </div>
                          )}
                        </div>

                        {submission ? (
                          <div className="border-t pt-4 space-y-3">
                            <div>
                              <h4 className="font-semibold mb-1">{submission.title}</h4>
                              <p className="text-sm text-muted-foreground">{submission.description}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {submission.github_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a href={submission.github_url} target="_blank" rel="noopener noreferrer">
                                    <Github className="h-4 w-4 mr-2" />
                                    GitHub
                                  </a>
                                </Button>
                              )}
                              {submission.demo_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a href={submission.demo_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Live Demo
                                  </a>
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Submitted on {formatDate(submission.submitted_at)}
                            </p>
                          </div>
                        ) : (
                          <div className="border-t pt-4">
                            {status === 'overdue' ? (
                              <div className="flex items-center gap-2 text-destructive mb-3">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Submission deadline has passed</span>
                              </div>
                            ) : (
                              <Button className="w-full btn-hover">
                                <Upload className="h-4 w-4 mr-2" />
                                Submit Project
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Submissions;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Plus, Edit, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import InviteJudges from "@/components/InviteJudges";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location?: string;
  is_online: boolean;
  max_participants?: number;
  created_at: string;
  // from event_record view
  registration_open?: boolean;
  status?: string;
}

const MyEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState("");

  useEffect(() => {
    checkAuthAndFetchEvents();
  }, []);

  const checkAuthAndFetchEvents = async () => {
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

      // Fetch events created by this user
      // Use the event_record view which includes calculated `registration_open`
      const { data: eventsData, error } = await (supabase as any)
        .from("event_record")
        .select("*")
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEvents(eventsData || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load your events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [processingEventId, setProcessingEventId] = useState<string | null>(null);

  const handleDeleteEvent = async (eventId: string) => {
    const ok = window.confirm("Are you sure you want to delete this event? This action cannot be undone.");
    if (!ok) return;
    try {
      setProcessingEventId(eventId);
  const { error } = await (supabase as any).from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Event deleted successfully." });
      checkAuthAndFetchEvents();
    } catch (err: any) {
      console.error("Delete event error:", err);
      toast({ title: "Error", description: err.message || "Failed to delete event.", variant: "destructive" });
    } finally {
      setProcessingEventId(null);
    }
  };

  const handleToggleRegistration = async (event: Event) => {
    try {
      setProcessingEventId(event.id);
      // Toggle between published (open) and registration_closed (closed)
      const newStatus = event.registration_open ? "registration_closed" : "published";
  const { error } = await (supabase as any).from("events").update({ status: newStatus }).eq("id", event.id);
      if (error) throw error;
      toast({ title: "Updated", description: `Registration ${newStatus === 'published' ? 'opened' : 'closed'}.` });
      checkAuthAndFetchEvents();
    } catch (err: any) {
      console.error("Toggle registration error:", err);
      toast({ title: "Error", description: err.message || "Failed to update registration status.", variant: "destructive" });
    } finally {
      setProcessingEventId(null);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any)
        .from("events")
        .insert({
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          location: isOnline ? null : location,
          is_online: isOnline,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Event Created!",
        description: "Your event has been successfully created.",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setLocation("");
      setIsOnline(false);
      setMaxParticipants("");
      setIsDialogOpen(false);

      // Refresh events list
      checkAuthAndFetchEvents();
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isEventActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const isEventUpcoming = (startDate: string) => {
    return new Date(startDate) > new Date();
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">My Events</h1>
                <p className="text-muted-foreground">
                  Manage and organize your hackathon events
                </p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-hover">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new hackathon event
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Event Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Hackathon 2024"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your event..."
                        rows={4}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date & Time *</Label>
                        <Input
                          id="start-date"
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date & Time *</Label>
                        <Input
                          id="end-date"
                          type="datetime-local"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-online"
                        checked={isOnline}
                        onCheckedChange={setIsOnline}
                      />
                      <Label htmlFor="is-online">This is an online event</Label>
                    </div>

                    {!isOnline && (
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Event venue address"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="max-participants">Max Participants (Optional)</Label>
                      <Input
                        id="max-participants"
                        type="number"
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                        placeholder="Leave empty for unlimited"
                        min="1"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Event"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {events.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h2 className="text-2xl font-semibold mb-2">No Events Yet</h2>
                    <p className="text-muted-foreground mb-4">
                      Create your first hackathon event to get started.
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                  const active = isEventActive(event.start_date, event.end_date);
                  const upcoming = isEventUpcoming(event.start_date);

                  return (
                    <Card key={event.id} className="glass card-hover">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                          {active && (
                            <Badge className="bg-green-500">Live</Badge>
                          )}
                          {upcoming && !active && (
                            <Badge variant="secondary">Upcoming</Badge>
                          )}
                          {!active && !upcoming && (
                            <Badge variant="outline">Ended</Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {event.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.start_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {event.is_online ? "Online Event" : event.location || "TBA"}
                            </span>
                          </div>
                          {event.max_participants && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>Max {event.max_participants} participants</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => navigate(`/organize-event?id=${event.id}`)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Manage
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => navigate(`/organize-event?id=${event.id}`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`reg-open-${event.id}`}
                                  checked={!!event.registration_open}
                                  onCheckedChange={() => handleToggleRegistration(event)}
                                  disabled={processingEventId === event.id}
                                />
                                <span className="text-sm text-muted-foreground">Registration Open</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteEvent(event.id)}
                                disabled={processingEventId === event.id}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                          <InviteJudges eventId={event.id} eventTitle={event.title} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MyEvents;
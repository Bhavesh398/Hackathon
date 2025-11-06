import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    loadEvents();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleRegister = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("event_registrations")
      .insert({ event_id: eventId, user_id: user.id });

    if (error) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Registered successfully!",
        description: "You've been registered for this event.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <header className="glass sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold gradient-text">Browse Events</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {events.length === 0 ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>No Events Yet</CardTitle>
              <CardDescription>Check back soon for upcoming hackathons!</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="card-hover glass">
                <div className="h-48 bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-6xl">
                  💻
                </div>
                <CardHeader>
                  <div className="inline-block mb-2">
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold">
                      Hackathon
                    </span>
                  </div>
                  <CardTitle>{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.start_date).toLocaleDateString()}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}
                    {event.max_participants && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Max {event.max_participants} participants
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full btn-hover" 
                    onClick={() => navigate(`/events/${event.id}/register`)}
                  >
                    Register Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Events;
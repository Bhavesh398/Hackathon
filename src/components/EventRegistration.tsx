import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { type Database } from "@/types/supabase";

const registrationSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number"),
  college_name: z.string().min(2, "College name is required"),
  course: z.string().min(2, "Course name is required"),
  graduation_year: z.number().min(2020).max(2030),
  github_url: z.string().url("Invalid GitHub URL").optional().or(z.literal("")),
  linkedin_url: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
  portfolio_url: z.string().url("Invalid portfolio URL").optional().or(z.literal("")),
  team_name: z.string().optional(),
  why_join: z.string().min(50, "Please write at least 50 characters about why you want to join"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;
type RegistrationStatus = Database['public']['Enums']['registration_status'];

export default function EventRegistration() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [event, setEvent] = useState<Database['public']['Tables']['events']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  const loadEventDetails = async () => {
    if (!eventId) {
      navigate("/events");
      return;
    }

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error || !event) {
      toast({
        title: "Error",
        description: error?.message || "Event not found",
        variant: "destructive",
      });
      navigate("/events");
      return;
    }

    setEvent(event);
    setLoading(false);
  };

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      college_name: "",
      course: "",
      graduation_year: 2024,
      github_url: "",
      linkedin_url: "",
      portfolio_url: "",
      team_name: "",
      why_join: "",
    },
  });

  async function onSubmit(data: RegistrationForm) {
    try {
      setIsSubmitting(true);

      // Check if event registration is open
      const { data: isOpen, error: checkError } = await supabase
        .rpc('is_registration_open', { event_id: eventId });

      if (checkError) throw checkError;
      if (!isOpen) {
        toast({
          title: "Registration Closed",
          description: "Event registration is no longer open.",
          variant: "destructive",
        });
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to register for this event.",
          variant: "destructive",
        });
        return;
      }

      // If user is creating a team (team_name provided) and event has a max_participants limit,
      // enforce that only that many distinct teams can be created.
      const teamName = (data.team_name || '').toString().trim();
      if (teamName && event?.max_participants != null) {
        // fetch registrations for this event that have a team_name and are pending/approved
        const { data: existingRegs, error: regsError } = await supabase
          .from('event_registrations')
          .select('team_name')
          .eq('event_id', eventId)
          .in('registration_status', ['approved', 'pending']);

        if (regsError) throw regsError;

        const uniqueTeams = new Set<string>();
        (existingRegs || []).forEach((r: any) => {
          const tn = (r.team_name || '').toString().trim();
          if (tn) uniqueTeams.add(tn);
        });

        if (uniqueTeams.size >= event.max_participants) {
          toast({
            title: 'Team Limit Reached',
            description: 'The maximum number of teams for this event has been reached. You cannot create a new team.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Submit registration
      const { error: registrationError } = await supabase
        .from('event_registrations')
        .insert([
          {
            event_id: eventId,
            user_id: user.id,
            ...data,
            status: 'pending' as RegistrationStatus
          }
        ]);

      if (registrationError) {
        if (registrationError.code === '23505') {
          toast({
            title: "Already Registered",
            description: "You have already registered for this event.",
            variant: "destructive",
          });
          return;
        }
        throw registrationError;
      }

      toast({
        title: "Registration Successful",
        description: "Your registration has been submitted successfully.",
      });

      navigate("/events");

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to submit registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-error">Event not found</h1>
          <p className="mt-2 text-muted-foreground">The event you're looking for does not exist.</p>
          <Button className="mt-4" onClick={() => navigate("/events")}>
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <header className="glass sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
          <h1 className="text-2xl font-bold gradient-text">Register for {event.title}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Registration Form</CardTitle>
            <CardDescription>Fill in your details to register for {event.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="college_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>College Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your College Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="course"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <FormControl>
                        <Input placeholder="B.Tech Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="graduation_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Graduation Year</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="2020" 
                          max="2030" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="github_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub Profile (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://github.com/username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn Profile (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portfolio_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourportfolio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="team_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your team name" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank if you haven't formed a team yet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="why_join"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do you want to join this event?</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your motivation and what you hope to achieve..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 50 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Registration"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

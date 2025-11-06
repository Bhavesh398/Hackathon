import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Event, Round } from "@/types/event";

type FormErrors = {
  title?: string;
  dates?: string;
  teamSize?: string;
  rounds?: string[];
};

const OrganizeEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const eventId = params.get("id");

  // form state
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  const [minTeamSize, setMinTeamSize] = useState(1);
  const [maxTeamSize, setMaxTeamSize] = useState(1);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [registrationFee, setRegistrationFee] = useState(0);
  const [judgesCriteriaText, setJudgesCriteriaText] = useState("");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (eventId) loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      if (!event) return;

      setTitle(event.title || "");
      setTheme(event.theme || "");
      setStartDate(event.start_date ? new Date(event.start_date).toISOString().slice(0,16) : "");
      setEndDate(event.end_date ? new Date(event.end_date).toISOString().slice(0,16) : "");
      setDescription(event.description || "");
      setIsTeamEvent(event.is_team_event);
      setMinTeamSize(event.min_team_size || 1);
      setMaxTeamSize(event.max_team_size || 1);
      setRegistrationDeadline(event.registration_deadline ? new Date(event.registration_deadline).toISOString().slice(0,16) : "");
      setRegistrationFee(event.registration_fee || 0);

      // Parse judges criteria and rounds from prizes JSON if present
      const prizes = event.prizes || {};
      if (prizes?.judges_criteria) {
        setJudgesCriteriaText(Array.isArray(prizes.judges_criteria) ? prizes.judges_criteria.join("\n") : String(prizes.judges_criteria));
      }
      if (prizes?.rounds) {
        setRounds(prizes.rounds.map((r: Round) => ({
          id: r.id,
          name: r.name,
          start_date: r.start_date || "",
          end_date: r.end_date || ""
        })));
      }
    } catch (error: any) {
      console.error("Error loading event:", error);
      toast({ title: "Error", description: error.message || "Failed to load event", variant: 'destructive' });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!title.trim()) {
      errors.title = "Event title is required";
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      errors.dates = "End date must be after start date";
    }

    if (isTeamEvent) {
      if (minTeamSize < 1) {
        errors.teamSize = "Minimum team size must be at least 1";
      }
      if (maxTeamSize < minTeamSize) {
        errors.teamSize = "Maximum team size must be greater than or equal to minimum team size";
      }
    }

    const roundErrors: string[] = [];
    rounds.forEach((round, index) => {
      if (!round.name.trim()) {
        roundErrors[index] = "Round name is required";
      }
      if (round.start_date && round.end_date && new Date(round.start_date) >= new Date(round.end_date)) {
        roundErrors[index] = "Round end date must be after start date";
      }
    });
    if (roundErrors.length > 0) {
      errors.rounds = roundErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addRound = () => setRounds(prev => [...prev, { name: "", start_date: "", end_date: "" }]);
  const removeRound = (idx: number) => setRounds(prev => prev.filter((_, i) => i !== idx));
  const updateRound = (idx: number, patch: Partial<Round>) => setRounds(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fix the form errors before submitting", variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const judges_criteria = judgesCriteriaText.split('\n').map(s => s.trim()).filter(Boolean);
      const prizesPayload = {
        judges_criteria,
        rounds: rounds.map(r => ({ 
          name: r.name, 
          start_date: r.start_date, 
          end_date: r.end_date 
        }))
      };

      const payload: Omit<Event, 'id'> = {
        title,
        theme,
        description,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        min_team_size: minTeamSize,
        max_team_size: maxTeamSize,
        registration_fee: registrationFee || null,
        is_team_event: isTeamEvent,
        prizes: prizesPayload,
      };

      if (eventId) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', eventId);
        if (error) throw error;

        toast({ title: 'Event Updated', description: 'Your event was updated successfully' });
      } else {
        payload.created_by = user.id;
        const { error } = await supabase
          .from('events')
          .insert(payload);
        if (error) throw error;

        toast({ title: 'Event Created', description: 'Your event was created successfully' });
      }

      navigate('/my-events');
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save event', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-6 w-6" />
            {eventId ? 'Edit Event' : 'Organize Your Event'}
          </CardTitle>
          <CardDescription>
            Create and manage your hackathon event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Event Title *</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                className={formErrors.title ? "border-red-500" : ""}
              />
              {formErrors.title && <p className="text-sm text-red-500">{formErrors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input 
                  type="datetime-local" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className={formErrors.dates ? "border-red-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input 
                  type="datetime-local" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className={formErrors.dates ? "border-red-500" : ""}
                />
              </div>
              {formErrors.dates && <p className="text-sm text-red-500 col-span-2">{formErrors.dates}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            <div className="flex gap-4">
              <div className="w-1/3">
                <Label>Is Team Event</Label>
                <select 
                  value={String(isTeamEvent)} 
                  onChange={(e) => setIsTeamEvent(e.target.value === 'true')}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="w-1/3">
                <Label>Min Team Size</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={minTeamSize} 
                  onChange={(e) => setMinTeamSize(parseInt(e.target.value || '1'))}
                  className={formErrors.teamSize ? "border-red-500" : ""}
                  disabled={!isTeamEvent}
                />
              </div>
              <div className="w-1/3">
                <Label>Max Team Size</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={maxTeamSize} 
                  onChange={(e) => setMaxTeamSize(parseInt(e.target.value || '1'))}
                  className={formErrors.teamSize ? "border-red-500" : ""}
                  disabled={!isTeamEvent}
                />
              </div>
              {formErrors.teamSize && <p className="text-sm text-red-500">{formErrors.teamSize}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registration Deadline *</Label>
                <Input 
                  type="datetime-local" 
                  value={registrationDeadline} 
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Registration Fee (INR)</Label>
                <Input 
                  type="number" 
                  min={0} 
                  value={registrationFee} 
                  onChange={(e) => setRegistrationFee(parseFloat(e.target.value || '0'))} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Judging Criteria (one per line)</Label>
              <Textarea 
                value={judgesCriteriaText} 
                onChange={(e) => setJudgesCriteriaText(e.target.value)} 
                rows={4}
                placeholder="Enter each judging criterion on a new line"
              />
              <p className="text-xs text-muted-foreground">Judging criteria will be saved and only visible to users with judge role in the Judge Panel.</p>
            </div>

            <div className="space-y-2">
              <Label>Event Rounds</Label>
              <div className="space-y-2">
                {rounds.map((r, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 items-end">
                      <Input 
                        placeholder="Round name" 
                        value={r.name} 
                        onChange={(e) => updateRound(idx, { name: e.target.value })}
                        className={formErrors.rounds?.[idx] ? "border-red-500" : ""}
                      />
                      <Input 
                        type="datetime-local" 
                        value={r.start_date} 
                        onChange={(e) => updateRound(idx, { start_date: e.target.value })}
                        className={formErrors.rounds?.[idx] ? "border-red-500" : ""}
                      />
                      <Input 
                        type="datetime-local" 
                        value={r.end_date} 
                        onChange={(e) => updateRound(idx, { end_date: e.target.value })}
                        className={formErrors.rounds?.[idx] ? "border-red-500" : ""}
                      />
                      <Button type="button" variant="destructive" onClick={() => removeRound(idx)}>Remove</Button>
                    </div>
                    {formErrors.rounds?.[idx] && (
                      <p className="text-sm text-red-500">{formErrors.rounds[idx]}</p>
                    )}
                  </div>
                ))}
                <Button type="button" onClick={addRound}>Add Round</Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/my-events')} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (eventId ? 'Update Event' : 'Create Event')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizeEvent;
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface InviteJudgesProps {
  eventId: string;
  eventTitle: string;
}

const InviteJudges = ({ eventId, eventTitle }: InviteJudgesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addEmail = () => {
    const trimmedEmail = currentEmail.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (emails.includes(trimmedEmail)) {
      toast({
        title: "Duplicate Email",
        description: "This email has already been added",
        variant: "destructive",
      });
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setCurrentEmail("");
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const sendInvitations = async () => {
    if (emails.length === 0) {
      toast({
        title: "No Emails",
        description: "Please add at least one email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create invitations in the database
      const invitations = emails.map(email => ({
        event_id: eventId,
        invited_email: email,
        invited_by: user.id,
        role: 'judge' as const,
        status: 'pending',
      }));

      const { error: dbError } = await (supabase as any)
        .from("event_invitations")
        .insert(invitations);

      if (dbError) throw dbError;

      // Get the user's access token and call edge function to send emails.
      // The function checks the Authorization header, so we must forward the
      // user's JWT as a Bearer token when invoking.
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) throw new Error('Missing access token for function invocation');

      const { error: emailError } = await supabase.functions.invoke('send-judge-invitation', {
        body: {
          emails,
          eventTitle,
          eventId,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (emailError) {
        console.error("Email sending error:", emailError);
        toast({
          title: "Invitations Created",
          description: "Invitations saved but emails could not be sent. Please check email configuration.",
        });
      } else {
        toast({
          title: "Invitations Sent!",
          description: `Successfully sent ${emails.length} invitation${emails.length > 1 ? 's' : ''}`,
        });
      }

      // Reset form
      setEmails([]);
      setCurrentEmail("");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error sending invitations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Judges
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Judges</DialogTitle>
          <DialogDescription>
            Send invitations to judges for "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Judge Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="judge@example.com"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                onClick={addEmail}
                disabled={!currentEmail.trim() || isSubmitting}
                size="icon"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter or click the button to add email
            </p>
          </div>

          {emails.length > 0 && (
            <div className="space-y-2">
              <Label>Invited Judges ({emails.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50 max-h-40 overflow-y-auto">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="ml-1 hover:text-destructive"
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={sendInvitations}
              disabled={isSubmitting || emails.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitations
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteJudges;

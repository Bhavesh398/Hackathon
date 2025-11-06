import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Input component not used in this file
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, X, Loader2, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import VoiceChat from "./VoiceChat";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AISaathi = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! I'm Saathi, your hackathon companion. I can help you with event registration, submission guidelines, judging criteria, certificates, incubation paths, and any questions about the platform. You can also chat with me using voice in multiple languages! How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

    const sendMessage = async (content?: string) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const messageToSend = (content ?? input).trim();
      if (!messageToSend) return; // nothing to send

      if (!user) {
        throw new Error('Please sign in to send messages');
      }

      // Add user message to chat
      setMessages((m) => [...m, { role: 'user', content: messageToSend }]);
      setInput('');

      // Call Saathi chat Edge Function
      console.log('Sending chat request:', {
        messageCount: messages.length,
        newMessage: messageToSend
      });

      // supabase.functions.invoke expects a string body for Edge Functions in some environments.
      // Send a JSON string and set Content-Type to ensure req.json() in the function succeeds.
      const invokeBody = JSON.stringify({
        messages: messages.concat({ role: 'user', content: messageToSend }),
        userId: user.id
      });

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('saathi-chat', {
        body: invokeBody,
        headers: { 'Content-Type': 'application/json' }
      });

      if (aiError) {
        // Dump full error to console for debugging
        console.error('AI chat error (full):', aiError);

        // Try to extract useful info from different possible shapes
        const status = (aiError as any)?.status || (aiError as any)?.statusCode;
        const message = (aiError as any)?.message || (aiError as any)?.error || 'Failed to get AI response.';
        const details = (aiError as any)?.data || (aiError as any)?.body || (aiError as any)?.response || undefined;

        const toastDescription = [
          status ? `status: ${status}` : null,
          message ? `${message}` : null,
          details ? `details: ${typeof details === 'string' ? details : JSON.stringify(details)}` : null,
        ].filter(Boolean).join(' | ');

        toast({
          title: "AI Error",
          description: toastDescription || 'Failed to get AI response. See console for details.',
          variant: "destructive"
        });

        return;
      }

      console.log('AI response:', aiResponse);

      // Add AI response to chat
      if (aiResponse?.response) {
        setMessages((m) => [...m, { role: 'assistant', content: aiResponse.response }]);
      }

    } catch (error: any) {
      console.error('Error in chat:', error);
      
      // Extract error message from various possible formats
      const errorMessage = error?.message || 
        error?.error?.message ||
        error?.error?.details ||
        'Failed to send message. Please try again.';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      // Remove the last message if we couldn't get an AI response
      setMessages(m => m.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <>
      {/* Chat Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 p-0"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col animate-scale-in">
          <CardHeader className="border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Saathi - Your Companion
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4 min-h-0 h-full">
              <div className="space-y-4 pb-24">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    setIsVoiceOpen(true);
                  }}
                  size="icon"
                  variant="outline"
                  title="Voice Chat"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter to send, Shift+Enter for newline
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask Saathi anything... (Shift+Enter for new line)"
                  disabled={isLoading}
                  className="flex-1 resize-none h-12"
                />
                <Button
                  onClick={() => void sendMessage()}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Chat Component */}
      <VoiceChat isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </>
  );
};

export default AISaathi;

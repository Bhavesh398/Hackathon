import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCommunityChat } from '@/hooks/useCommunityChat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CommunityChat = () => {
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { messages, loading, sendMessage, deleteMessage } = useCommunityChat();
  const endRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    // smooth scroll to the bottom when messages change
    try {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch (e) {
      // fallback: instant scroll
      if (endRef.current && endRef.current.parentElement) {
        endRef.current.parentElement.scrollTop = endRef.current.parentElement.scrollHeight;
      }
    }
  }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    if (!currentUserId) {
      toast({
        title: 'Error',
        description: 'Please sign in to send messages.',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      await sendMessage(newMessage);
      setNewMessage('');
    } catch (error: any) {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
      
      // Auto-retry for network errors
      if (error?.message?.toLowerCase().includes('network') || 
          error?.message?.toLowerCase().includes('connection')) {
        setTimeout(() => {
          toast({
            title: 'Retrying',
            description: 'Attempting to send message again...'
          });
          handleSendMessage(e);
        }, 2000);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="gradient-text">Community Chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.user_id === currentUserId ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`group max-w-[70%] rounded-lg p-3 ${
                      message.user_id === currentUserId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{(message.sender_name ? message.sender_name.slice(0,1).toUpperCase() : '')}</AvatarFallback>
                        </Avatar>
                        {message.sender_name ? (
                          <div className="text-xs opacity-90 font-medium">{message.sender_name}</div>
                        ) : null}
                      </div>
                    <div className="break-words">{message.content}</div>
                    <div className="flex items-center justify-between text-xs opacity-70 mt-1">
                      <span>
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {message.user_id === currentUserId && (
                        <button
                          onClick={async () => {
                            try {
                              if (window.confirm('Are you sure you want to delete this message?')) {
                                await deleteMessage(message.id);
                                toast({
                                  title: 'Success',
                                  description: 'Message deleted successfully',
                                });
                              }
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to delete message',
                                variant: 'destructive'
                              });
                            }
                          }}
                          className="ml-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {/* dummy element to scroll into view */}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CommunityChat;
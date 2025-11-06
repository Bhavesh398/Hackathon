import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useEventChat } from "@/hooks/useEventChat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface EventChatProps {
  eventId: string;
}

const EventChat = ({ eventId }: EventChatProps) => {
  const [newMessage, setNewMessage] = useState("");
  const { messages, typingUsers, loading, sendMessage, updateTypingStatus } = useEventChat(eventId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const mentions = extractMentions(newMessage);
    await sendMessage(newMessage, mentions);
    setNewMessage("");
  };

  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    updateTypingStatus();

    typingTimeoutRef.current = setTimeout(() => {
      // Typing stopped
    }, 3000);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.matchAll(mentionRegex);
    return Array.from(matches, (m) => m[1]);
  };

  const formatMessageContent = (content: string) => {
    return content.replace(/@(\w+)/g, '<span class="text-primary font-semibold">@$1</span>');
  };

  if (loading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Event Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.profiles?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">
                      {message.profiles?.full_name || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{
                      __html: formatMessageContent(message.content),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {typingUsers.length > 0 && (
            <div className="text-sm text-muted-foreground italic px-4">
              {typingUsers.map((u) => u.full_name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message... (use @username to mention)"
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EventChat;

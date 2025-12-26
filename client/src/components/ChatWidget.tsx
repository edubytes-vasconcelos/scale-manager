import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useChatMessages, useSendChatMessage, useUnreadMessageCount, useMarkMessagesAsRead, useVolunteers } from "@/hooks/use-data";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatWidgetProps {
  volunteerId: string;
  organizationId: string;
  isAdmin?: boolean;
  targetVolunteerId?: string | null;
}

export function ChatWidget({ volunteerId, organizationId, isAdmin = false, targetVolunteerId = null }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading } = useChatMessages(volunteerId, organizationId, isAdmin);
  const { data: volunteers = [] } = useVolunteers(organizationId);
  const { data: unreadCount = 0 } = useUnreadMessageCount(volunteerId, organizationId);
  const sendMessage = useSendChatMessage();
  const markAsRead = useMarkMessagesAsRead();

  const filteredMessages = isAdmin && targetVolunteerId
    ? messages.filter(m => m.senderId === targetVolunteerId || m.receiverId === targetVolunteerId)
    : messages;

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead.mutate({ volunteerId, organizationId });
    }
  }, [isOpen, unreadCount, volunteerId, organizationId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredMessages, isOpen]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    await sendMessage.mutateAsync({
      organizationId,
      senderId: volunteerId,
      receiverId: isAdmin ? targetVolunteerId : null,
      content: message.trim(),
      isFromAdmin: isAdmin,
    });
    
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getVolunteerName = (id: string) => {
    const volunteer = volunteers.find(v => v.id === id);
    return volunteer?.name || "Voluntário";
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg"
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-background border border-border rounded-lg shadow-xl flex flex-col max-h-[500px]">
      <div className="flex items-center justify-between gap-2 p-4 border-b border-border bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">
            {isAdmin && targetVolunteerId 
              ? `Chat com ${getVolunteerName(targetVolunteerId)}`
              : "Chat com Administração"
            }
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            data-testid="button-minimize-chat"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            data-testid="button-close-chat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">Carregando...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            {isAdmin 
              ? "Nenhuma mensagem nesta conversa ainda."
              : "Envie uma mensagem para a administração."
            }
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMine = msg.senderId === volunteerId;
            const isAdminMessage = msg.isFromAdmin === "true";
            
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                data-testid={`message-${msg.id}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {!isMine && (
                    <div className="text-xs font-medium mb-1 opacity-80">
                      {isAdminMessage ? "Administração" : getVolunteerName(msg.senderId)}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {msg.createdAt && format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="resize-none min-h-[40px] max-h-[100px]"
            rows={1}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

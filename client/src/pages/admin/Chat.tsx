import { useState, useRef, useEffect } from "react";
import { useVolunteerProfile, useVolunteers, useChatConversations, useChatMessages, useSendChatMessage } from "@/hooks/use-data";
import { MessageCircle, Send, Users, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppLayout from "@/components/AppLayout";

export default function AdminChat() {
  const { data: volunteer } = useVolunteerProfile();
  const { data: volunteers = [] } = useVolunteers(volunteer?.organizationId);
  const { data: conversations = [] } = useChatConversations(volunteer?.organizationId);
  
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading: loadingMessages } = useChatMessages(
    volunteer?.id, 
    volunteer?.organizationId, 
    true
  );
  const sendMessage = useSendChatMessage();

  const filteredMessages = selectedVolunteerId
    ? messages.filter(m => m.senderId === selectedVolunteerId || m.receiverId === selectedVolunteerId)
    : [];

  const volunteersWithConversations = volunteers.filter(v => {
    const hasConversation = conversations.some(c => c.senderId === v.id);
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isNotCurrentUser = v.id !== volunteer?.id;
    const isNotAdmin = v.accessLevel !== "admin";
    
    if (searchTerm) {
      return matchesSearch && isNotCurrentUser && isNotAdmin;
    }
    return hasConversation && matchesSearch && isNotCurrentUser && isNotAdmin;
  }).sort((a, b) => {
    const aHasConvo = conversations.some(c => c.senderId === a.id);
    const bHasConvo = conversations.some(c => c.senderId === b.id);
    if (aHasConvo && !bHasConvo) return -1;
    if (!aHasConvo && bHasConvo) return 1;
    return a.name.localeCompare(b.name);
  });

  const selectedVolunteer = volunteers.find(v => v.id === selectedVolunteerId);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredMessages]);

  const handleSend = async () => {
    if (!message.trim() || !volunteer?.id || !volunteer?.organizationId || !selectedVolunteerId) return;
    
    await sendMessage.mutateAsync({
      organizationId: volunteer.organizationId,
      senderId: volunteer.id,
      receiverId: selectedVolunteerId,
      content: message.trim(),
      isFromAdmin: true,
    });
    
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const getLastMessage = (volunteerId: string) => {
    const conv = conversations.find(c => c.senderId === volunteerId);
    return conv?.lastMessage || "";
  };

  const getLastMessageTime = (volunteerId: string) => {
    const conv = conversations.find(c => c.senderId === volunteerId);
    if (!conv?.lastMessageAt) return "";
    return format(new Date(conv.lastMessageAt), "dd/MM HH:mm", { locale: ptBR });
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-background ${selectedVolunteerId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-primary" />
              Mensagens
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar voluntário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-volunteer"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {volunteersWithConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum voluntário encontrado" : "Nenhuma conversa ainda"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {volunteersWithConversations.map((vol) => {
                  const hasMessages = conversations.some(c => c.senderId === vol.id);
                  return (
                    <button
                      key={vol.id}
                      onClick={() => setSelectedVolunteerId(vol.id)}
                      className={`w-full p-4 text-left hover-elevate transition-colors ${
                        selectedVolunteerId === vol.id ? "bg-primary/5" : ""
                      }`}
                      data-testid={`button-conversation-${vol.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(vol.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground truncate">{vol.name}</span>
                            {hasMessages && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {getLastMessageTime(vol.id)}
                              </span>
                            )}
                          </div>
                          {hasMessages ? (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {getLastMessage(vol.id)}
                            </p>
                          ) : (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Iniciar conversa
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`flex-1 flex flex-col ${selectedVolunteerId ? 'flex' : 'hidden md:flex'}`}>
          {selectedVolunteerId ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => setSelectedVolunteerId(null)}
                  data-testid="button-back-to-list"
                  aria-label="Voltar para lista"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedVolunteer ? getInitials(selectedVolunteer.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-foreground">{selectedVolunteer?.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedVolunteer?.email || "Sem email"}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center text-muted-foreground py-8">Carregando mensagens...</div>
                ) : filteredMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma mensagem ainda. Envie a primeira!
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isMine = msg.senderId === volunteer?.id;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                        data-testid={`admin-message-${msg.id}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
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

              <div className="p-4 border-t border-border">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    className="resize-none min-h-[40px] max-h-[100px]"
                    rows={1}
                    data-testid="input-admin-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessage.isPending}
                    data-testid="button-admin-send"
                    aria-label="Enviar mensagem"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Mensagens</h2>
              <p className="text-muted-foreground max-w-sm">
                Selecione uma conversa na lista ou busque por um voluntário para iniciar uma nova conversa.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

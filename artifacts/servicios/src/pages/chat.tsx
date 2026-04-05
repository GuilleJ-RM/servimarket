import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { 
  useGetMessages, 
  useSendMessage, 
  useGetConversations,
  getGetMessagesQueryKey
} from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, ExternalLink, MessageSquare, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Chat() {
  const [, params] = useRoute("/mensajes/:id");
  const conversationId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Need to get conversation details to know who we're talking to and what listing it's about
  const { data: conversations, isLoading: loadingConversations } = useGetConversations();
  const conversation = conversations?.find(c => c.id === conversationId);

  const { data: messages, isLoading: loadingMessages } = useGetMessages(conversationId, {
    query: {
      enabled: !!conversationId,
      refetchInterval: 2000, // Poll every 2s for real-time feel
    }
  });

  const sendMessage = useSendMessage();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    sendMessage.mutate(
      { id: conversationId, data: { content: newMessage.trim() } },
      {
        onSuccess: () => {
          setNewMessage("");
        }
      }
    );
  };

  const isLoading = loadingConversations || loadingMessages;
  const isProviderView = conversation ? user.id === conversation.providerId : false;
  const otherUser = conversation ? (isProviderView ? conversation.client : conversation.provider) : null;
  const isAdminChat = otherUser?.role === "admin";
  const roleTag = isAdminChat ? "Soporte" : isProviderView ? "Cliente" : "Profesional";

  return (
    <Layout>
      <div className="flex-1 flex flex-col container mx-auto px-2 md:px-4 max-w-3xl h-[calc(100dvh-64px)] py-2 md:py-4">
        
        {/* Chat Header */}
        <div className={`bg-card border rounded-t-xl md:rounded-t-2xl px-3 py-2.5 md:p-4 flex items-center gap-2 md:gap-3 shrink-0 shadow-sm z-10 relative ${isAdminChat ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
          <Button variant="ghost" size="icon" asChild className="rounded-full h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
            <Link href="/mensajes">
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </Link>
          </Button>
          
          {isLoading ? (
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="w-28 h-4" />
                <Skeleton className="w-20 h-3" />
              </div>
            </div>
          ) : otherUser && (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0 ${isAdminChat ? 'ring-2 ring-amber-400 border-2 border-amber-300' : 'bg-muted'}`}>
                {otherUser.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${isAdminChat ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-secondary text-secondary-foreground'}`}>
                    {isAdminChat ? <ShieldCheck className="w-5 h-5" /> : otherUser.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm md:text-base leading-none truncate">{otherUser.name}</h2>
                  <Badge variant={isAdminChat ? "default" : isProviderView ? "secondary" : "default"} className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${isAdminChat ? 'bg-amber-500 hover:bg-amber-500 text-white' : ''}`}>
                    {isAdminChat && <ShieldCheck className="w-3 h-3 mr-0.5" />}
                    {roleTag}
                  </Badge>
                </div>
                {conversation?.listing && (
                  <Link href={`/servicio/${conversation.listingId}`} className="text-[11px] md:text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                    {conversation.listing.title} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 bg-muted/10 border-x overflow-y-auto px-3 py-3 md:p-4 space-y-3 relative">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-2/3 ml-auto rounded-2xl rounded-tr-none" />
              <Skeleton className="h-10 w-1/2 rounded-2xl rounded-tl-none" />
              <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tl-none" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 opacity-50" />
              </div>
              <p className="font-medium text-foreground text-sm">Inicia la conversación</p>
              <p className="text-xs mt-1">Envía un mensaje para ponerte en contacto.</p>
            </div>
          ) : (
            messages?.map((msg, index) => {
              const isMine = msg.senderId === user.id;
              const isAdminMsg = msg.sender?.role === "admin";
              const showTime = index === 0 || 
                new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000;
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {showTime && (
                    <div className="text-[10px] font-medium text-muted-foreground my-1.5 uppercase tracking-wider px-2">
                      {format(new Date(msg.createdAt), "HH:mm", { locale: es })}
                    </div>
                  )}
                  {isAdminMsg && !isMine && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium mb-0.5 px-1">
                      <ShieldCheck className="w-3 h-3" />
                      Soporte ServiMarket
                    </div>
                  )}
                  <div 
                    className={`max-w-[85%] md:max-w-[75%] px-3 py-2 md:px-4 md:py-3 text-sm md:text-[15px] shadow-sm ${
                      isMine 
                        ? isAdminMsg
                          ? 'bg-amber-500 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
                        : isAdminMsg
                          ? 'bg-amber-50 border-amber-200 border text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800 rounded-2xl rounded-tl-sm'
                          : 'bg-card border text-card-foreground rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-card border rounded-b-xl md:rounded-b-2xl px-3 py-2.5 md:p-4 shrink-0 shadow-sm relative z-10">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 h-10 md:h-12 rounded-full border bg-muted/20 px-4 md:px-6 text-sm"
              disabled={sendMessage.isPending || isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-10 w-10 md:h-12 md:w-12 rounded-full shrink-0" 
              disabled={!newMessage.trim() || sendMessage.isPending || isLoading}
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </form>
        </div>

      </div>
    </Layout>
  );
}

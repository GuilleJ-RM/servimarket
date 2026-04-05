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
import { Send, ArrowLeft, MoreVertical, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const otherUser = conversation ? (user.id === conversation.providerId ? conversation.client : conversation.provider) : null;

  return (
    <Layout>
      <div className="flex-1 flex flex-col container mx-auto px-4 max-w-4xl h-[calc(100dvh-64px)] py-4">
        
        {/* Chat Header */}
        <div className="bg-card border-2 rounded-t-2xl p-4 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link href="/mensajes">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-24 h-3" />
                </div>
              </div>
            ) : otherUser && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                  {otherUser.avatarUrl ? (
                    <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                      {otherUser.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold leading-none">{otherUser.name}</h2>
                  {conversation?.listing && (
                    <Link href={`/servicio/${conversation.listingId}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      {conversation.listing.title} <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 bg-muted/10 border-x-2 overflow-y-auto p-4 space-y-4 relative">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-2/3 ml-auto rounded-2xl rounded-tr-none" />
              <Skeleton className="h-12 w-1/2 rounded-2xl rounded-tl-none" />
              <Skeleton className="h-20 w-3/4 rounded-2xl rounded-tl-none" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium text-foreground">Inicia la conversación</p>
              <p className="text-sm mt-1">Envía un mensaje para ponerte en contacto.</p>
            </div>
          ) : (
            messages?.map((msg, index) => {
              const isMine = msg.senderId === user.id;
              const showTime = index === 0 || 
                new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000;
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {showTime && (
                    <div className="text-[10px] font-medium text-muted-foreground my-2 uppercase tracking-wider px-2">
                      {format(new Date(msg.createdAt), "HH:mm", { locale: es })}
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] px-4 py-3 text-[15px] shadow-sm ${
                      isMine 
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
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
        <div className="bg-card border-2 rounded-b-2xl p-4 shrink-0 shadow-sm relative z-10">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 h-12 rounded-full border-2 bg-muted/20 px-6"
              disabled={sendMessage.isPending || isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12 rounded-full shrink-0" 
              disabled={!newMessage.trim() || sendMessage.isPending || isLoading}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>

      </div>
    </Layout>
  );
}

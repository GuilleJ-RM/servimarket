import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetConversations } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Mensajes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: conversations, isLoading } = useGetConversations({
    query: {
      refetchInterval: 5000 // Poll occasionally for new messages in the list
    }
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Mensajes
          </h1>
          <p className="text-muted-foreground mt-1">Tus conversaciones con clientes y profesionales.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-card rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Aún no tienes mensajes</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Cuando contactes a un profesional o un cliente se interese en tus servicios, tus conversaciones aparecerán aquí.
              </p>
              <Button asChild>
                <Link href="/servicios">Explorar servicios</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y flex-1">
              {conversations?.map((conv) => {
                const isProviderView = user.id === conv.providerId;
                const otherUser = isProviderView ? conv.client : conv.provider;
                
                return (
                  <Link key={conv.id} href={`/mensajes/${conv.id}`}>
                    <div className="p-6 flex items-start gap-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                      <div className="w-14 h-14 rounded-full bg-muted overflow-hidden flex-shrink-0 relative border-2 border-transparent group-hover:border-primary transition-colors">
                        {otherUser.avatarUrl ? (
                          <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xl">
                            {otherUser.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <div className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-background"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className={`font-bold text-lg truncate ${conv.unreadCount > 0 ? 'text-foreground' : 'text-foreground/90'}`}>
                            {otherUser.name}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-sm text-muted-foreground flex-shrink-0 ml-4 font-medium">
                              {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        {conv.listing && (
                          <div className="text-xs text-primary font-medium mb-1 truncate flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-primary/10 rounded-full">
                              Servicio: {conv.listing.title}
                            </span>
                          </div>
                        )}
                        
                        <div className={`text-base line-clamp-1 ${conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessage.senderId === user.id && <span className="mr-1">Tú:</span>}
                              {conv.lastMessage.content}
                            </>
                          ) : (
                            <span className="italic">Inicia la conversación</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

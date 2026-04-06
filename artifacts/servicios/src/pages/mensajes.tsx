import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetConversations, getGetConversationsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Mensajes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: conversations, isLoading } = useGetConversations({
    query: {
      queryKey: getGetConversationsQueryKey(),
      refetchInterval: 5000
    }
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <Layout>
      <div className="bg-muted/30 py-5 md:py-8 border-b">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Mensajes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Tus conversaciones con clientes y profesionales.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8 max-w-3xl">
        <div className="bg-card rounded-xl md:rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[400px] md:min-h-[500px]">
          {isLoading ? (
            <div className="p-3 md:p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton className="w-11 h-11 md:w-14 md:h-14 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-full flex items-center justify-center mb-4 md:mb-6">
                <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground opacity-50" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">Aún no tienes mensajes</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4 md:mb-6">
                Cuando contactes a un profesional o un cliente se interese en tus servicios, tus conversaciones aparecerán aquí.
              </p>
              <Button asChild size="sm">
                <Link href="/servicios">Explorar servicios</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y flex-1">
              {conversations?.map((conv) => {
                const isProviderView = user.id === conv.providerId;
                const otherUser = isProviderView ? conv.client : conv.provider;
                const isAdminConv = otherUser.role === "admin";
                const roleTag = isAdminConv ? "Soporte" : isProviderView ? "Cliente" : "Profesional";
                
                return (
                  <Link key={conv.id} href={`/mensajes/${conv.id}`}>
                    <div className={`px-3 py-3 md:px-5 md:py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer group ${isAdminConv ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                      <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0 relative border-2 transition-colors ${isAdminConv ? 'border-amber-400 ring-2 ring-amber-200' : 'border-transparent group-hover:border-primary'}`}>
                        {otherUser.avatarUrl ? (
                          <img src={otherUser.avatarUrl.startsWith("/api") ? otherUser.avatarUrl : `/api${otherUser.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center font-bold text-base md:text-lg ${isAdminConv ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-secondary text-secondary-foreground'}`}>
                            {isAdminConv ? <ShieldCheck className="w-5 h-5" /> : otherUser.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-semibold text-sm md:text-base truncate ${conv.unreadCount > 0 ? 'text-foreground' : 'text-foreground/90'}`}>
                              {otherUser.name}
                            </span>
                            <Badge variant={isAdminConv ? "default" : isProviderView ? "secondary" : "default"} className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${isAdminConv ? 'bg-amber-500 hover:bg-amber-500 text-white' : ''}`}>
                              {isAdminConv && <ShieldCheck className="w-3 h-3 mr-0.5" />}
                              {roleTag}
                            </Badge>
                          </div>
                          {conv.lastMessage && (
                            <span className="text-[11px] md:text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {new Date(conv.lastMessage.createdAt).toLocaleDateString("es")}
                            </span>
                          )}
                        </div>
                        
                        {conv.listing && (
                          <p className="text-[11px] text-primary font-medium mb-0.5 truncate">
                            Sobre: {conv.listing.title}
                          </p>
                        )}
                        
                        <p className={`text-sm line-clamp-1 ${conv.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessage.senderId === user.id && <span className="mr-1">Tú:</span>}
                              {conv.lastMessage.content}
                            </>
                          ) : (
                            <span className="italic">Inicia la conversación</span>
                          )}
                        </p>
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

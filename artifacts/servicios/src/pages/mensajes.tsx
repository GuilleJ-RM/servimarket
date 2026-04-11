import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetConversations, getGetConversationsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { MessageSquare, ShieldCheck, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { imgUrl } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { useSEO } from "@/hooks/use-seo";

type FilterTab = "todos" | "no-leidos" | "clientes" | "profesionales" | "soporte";

export default function Mensajes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useSEO({ title: "Mensajes", noindex: true });

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <MensajesContent user={user} />;
}

function MensajesContent({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("todos");
  
  const { data: conversations, isLoading, isError } = useGetConversations({
    query: {
      queryKey: getGetConversationsQueryKey(),
      refetchInterval: 5000,
      refetchIntervalInBackground: false,
    }
  });

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    
    let filtered = [...conversations];

    // Apply tab filter
    if (activeFilter === "no-leidos") {
      filtered = filtered.filter(c => c.unreadCount > 0);
    } else if (activeFilter === "clientes") {
      filtered = filtered.filter(c => {
        const isProviderView = user.id === c.providerId;
        const otherUser = isProviderView ? c.client : c.provider;
        return otherUser.role === "client";
      });
    } else if (activeFilter === "profesionales") {
      filtered = filtered.filter(c => {
        const isProviderView = user.id === c.providerId;
        const otherUser = isProviderView ? c.client : c.provider;
        return otherUser.role === "provider";
      });
    } else if (activeFilter === "soporte") {
      filtered = filtered.filter(c => {
        const isProviderView = user.id === c.providerId;
        const otherUser = isProviderView ? c.client : c.provider;
        return otherUser.role === "admin";
      });
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c => {
        const isProviderView = user.id === c.providerId;
        const otherUser = isProviderView ? c.client : c.provider;
        return (
          otherUser.name.toLowerCase().includes(q) ||
          c.listing?.title?.toLowerCase().includes(q) ||
          c.lastMessage?.content?.toLowerCase().includes(q)
        );
      });
    }

    // Sort: unread first, then by last message date
    filtered.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return filtered;
  }, [conversations, search, activeFilter, user]);

  const unreadTotal = conversations?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) ?? 0;

  const filters: { key: FilterTab; label: string; count?: number }[] = [
    { key: "todos", label: "Todos" },
    { key: "no-leidos", label: "No leídos", count: unreadTotal },
    { key: "clientes", label: "Clientes" },
    { key: "profesionales", label: "Profesionales" },
    { key: "soporte", label: "Soporte" },
  ];

  return (
    <Layout>
      <div className="bg-muted/30 py-5 md:py-8 border-b">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Mensajes
            {unreadTotal > 0 && (
              <Badge variant="destructive" className="h-6 min-w-[24px] px-2 text-xs rounded-full">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Tus conversaciones con clientes y profesionales.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8 max-w-3xl">
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, servicio o mensaje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={activeFilter === f.key ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs rounded-full flex-shrink-0"
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <Badge variant={activeFilter === f.key ? "secondary" : "destructive"} className="ml-1.5 h-4 min-w-[16px] px-1 text-[10px] rounded-full">
                  {f.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        <div className="bg-card rounded-xl md:rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[400px] md:min-h-[500px]">
          {isError ? (
            <ErrorState message="No se pudieron cargar las conversaciones" />
          ) : isLoading ? (
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
          ) : filteredConversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Search className="w-10 h-10 text-muted-foreground opacity-40 mb-3" />
              <p className="text-muted-foreground text-sm">No se encontraron conversaciones{search ? ` para "${search}"` : ""}.</p>
              {(search || activeFilter !== "todos") && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setActiveFilter("todos"); }}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y flex-1">
              {filteredConversations.map((conv) => {
                const isProviderView = user.id === conv.providerId;
                const otherUser = isProviderView ? conv.client : conv.provider;
                const isAdminConv = otherUser.role === "admin";
                const roleTag = isAdminConv ? "Soporte" : isProviderView ? "Cliente" : "Profesional";
                const hasUnread = conv.unreadCount > 0;
                
                return (
                  <Link key={conv.id} href={`/mensajes/${conv.id}`}>
                    <div className={`px-3 py-3 md:px-5 md:py-4 flex items-start gap-3 hover:bg-muted/50 transition-colors cursor-pointer group ${
                      isAdminConv ? 'bg-amber-50/50 dark:bg-amber-950/10' : hasUnread ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}>
                      <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0 relative border-2 transition-colors ${
                        isAdminConv ? 'border-amber-400 ring-2 ring-amber-200' : hasUnread ? 'border-primary ring-2 ring-primary/20' : 'border-transparent group-hover:border-primary'
                      }`}>
                        {otherUser.avatarUrl ? (
                          <img src={imgUrl(otherUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center font-bold text-base md:text-lg ${isAdminConv ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-secondary text-secondary-foreground'}`}>
                            {isAdminConv ? <ShieldCheck className="w-5 h-5" /> : otherUser.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {hasUnread && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background animate-pulse"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-sm md:text-base truncate ${hasUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'}`}>
                              {otherUser.name}
                            </span>
                            <Badge variant={isAdminConv ? "default" : isProviderView ? "secondary" : "default"} className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${isAdminConv ? 'bg-amber-500 hover:bg-amber-500 text-white' : ''}`}>
                              {isAdminConv && <ShieldCheck className="w-3 h-3 mr-0.5" />}
                              {roleTag}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {hasUnread && (
                              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] rounded-full">
                                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                              </Badge>
                            )}
                            {conv.lastMessage && (
                              <span className={`text-[11px] md:text-xs flex-shrink-0 ${hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                {new Date(conv.lastMessage.createdAt).toLocaleDateString("es")}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {conv.listing && (
                          <p className="text-[11px] text-primary font-medium mb-0.5 truncate">
                            Sobre: {conv.listing.title}
                          </p>
                        )}
                        
                        <p className={`text-sm line-clamp-1 ${hasUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessage.senderId === user.id && <span className="mr-1 text-muted-foreground font-normal">Tú:</span>}
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

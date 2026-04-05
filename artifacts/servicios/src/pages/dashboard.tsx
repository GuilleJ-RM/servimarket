import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetMyListings, useGetConversations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MessageSquare, TrendingUp, Eye, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, isProvider } = useAuth();
  const [, setLocation] = useLocation();
  const { data: listings, isLoading: loadingListings } = useGetMyListings();
  const { data: conversations, isLoading: loadingConversations } = useGetConversations();

  if (!user || !isProvider) {
    setLocation("/");
    return null;
  }

  const activeListingsCount = listings?.filter(l => l.isActive).length || 0;
  const unreadMessagesCount = conversations?.reduce((acc, curr) => acc + curr.unreadCount, 0) || 0;

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">¡Hola, {user.name}! Aquí está el resumen de tu actividad.</p>
          </div>
          <Button asChild size="lg" className="rounded-full">
            <Link href="/publicar">
              <PlusCircle className="mr-2 w-5 h-5" />
              Nueva publicación
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Publicaciones Activas</CardTitle>
              <Package className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingListings ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{activeListingsCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">De {listings?.length || 0} en total</p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mensajes sin leer</CardTitle>
              <MessageSquare className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingConversations ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <>
                  <div className="text-3xl font-bold">{unreadMessagesCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">En {conversations?.length || 0} conversaciones</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">Rendimiento</CardTitle>
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">Excelente</div>
              <p className="text-xs text-primary-foreground/80 mt-1">Tu perfil destaca en las búsquedas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 pb-4">
              <CardTitle>Últimas publicaciones</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/mis-publicaciones">Ver todas</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingListings ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : listings?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No tienes publicaciones aún.
                </div>
              ) : (
                <div className="divide-y">
                  {listings?.slice(0, 5).map((listing) => (
                    <div key={listing.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {listing.imageUrl ? (
                            <img src={listing.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl bg-primary/10 text-primary">
                              {listing.category?.icon}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold line-clamp-1">{listing.title}</div>
                          <div className="text-sm text-muted-foreground">
                            ${listing.price} • {listing.isActive ? "Activo" : "Pausado"}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/servicio/${listing.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10 pb-4">
              <CardTitle>Mensajes recientes</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/mensajes">Ir a mensajes</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingConversations ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : conversations?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No tienes mensajes recientes.
                </div>
              ) : (
                <div className="divide-y">
                  {conversations?.slice(0, 5).map((conv) => {
                    const otherUser = conv.clientId === user.id ? conv.provider : conv.client;
                    return (
                      <Link key={conv.id} href={`/mensajes/${conv.id}`}>
                        <div className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0 relative">
                            {otherUser.avatarUrl ? (
                              <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                                {otherUser.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            {conv.unreadCount > 0 && (
                              <div className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-background"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="font-semibold truncate">{otherUser.name}</span>
                              {conv.lastMessage && (
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {conv.lastMessage ? conv.lastMessage.content : "Nuevo chat"}
                            </div>
                            {conv.listing && (
                              <div className="text-xs text-primary mt-1 font-medium truncate">
                                Sobre: {conv.listing.title}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

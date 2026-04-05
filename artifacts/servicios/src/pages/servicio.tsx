import { useRoute } from "wouter";
import { useGetListing, useCreateConversation, getGetListingQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, CheckCircle2, ShieldCheck, MapPin, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Servicio() {
  const [, params] = useRoute("/servicio/:id");
  const listingId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: listing, isLoading } = useGetListing(listingId, {
    query: {
      enabled: !!listingId,
      queryKey: getGetListingQueryKey(listingId),
    }
  });

  const { user } = useAuth();
  const createConversation = useCreateConversation();

  const handleStartChat = () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    
    if (user.id === listing?.providerId) {
      toast({
        title: "No puedes iniciar un chat contigo mismo",
        variant: "destructive"
      });
      return;
    }

    createConversation.mutate(
      { data: { providerId: listing!.providerId, listingId } },
      {
        onSuccess: (conv) => {
          setLocation(`/mensajes/${conv.id}`);
        },
        onError: () => {
          toast({
            title: "Error al iniciar el chat",
            description: "Por favor intenta de nuevo",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleWhatsApp = () => {
    if (listing?.whatsapp) {
      const formattedNumber = listing.whatsapp.replace(/\D/g, "");
      const message = encodeURIComponent(`Hola, estoy interesado en tu publicación en ServiMarket: ${listing.title}`);
      window.open(`https://wa.me/${formattedNumber}?text=${message}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="w-full aspect-video rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Servicio no encontrado</h1>
          <Button onClick={() => setLocation("/servicios")}>Volver a explorar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline" className="bg-background text-sm py-1 px-3">
              {listing.category.icon} {listing.category.name}
            </Badge>
            <Badge className="text-sm py-1 px-3 bg-primary text-primary-foreground">
              {listing.type === "service" ? "Servicio" : "Producto"}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-balance">{listing.title}</h1>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Publicado el {format(new Date(listing.createdAt), "dd 'de' MMMM, yyyy", { locale: es })}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {listing.imageUrl && (
              <div className="rounded-2xl overflow-hidden shadow-lg border-2 bg-muted aspect-video">
                <img 
                  src={listing.imageUrl} 
                  alt={listing.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border-2">
              <h2 className="text-2xl font-bold mb-4">Descripción</h2>
              <div className="prose max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border-2">
              <h2 className="text-xl font-bold mb-4">Métodos de pago aceptados</h2>
              <div className="flex flex-wrap gap-3">
                {listing.paymentMethods.map(method => (
                  <Badge key={method} variant="secondary" className="px-4 py-2 text-sm rounded-full flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {method}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-2 shadow-lg sticky top-24">
              <CardContent className="p-6">
                <div className="text-4xl font-extrabold text-primary mb-6">
                  ${listing.price.toLocaleString()}
                </div>
                
                <div className="flex flex-col gap-4">
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg font-bold rounded-xl"
                    onClick={handleStartChat}
                    disabled={createConversation.isPending}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    {createConversation.isPending ? "Iniciando..." : "Iniciar chat"}
                  </Button>
                  
                  {listing.whatsapp && (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="w-full h-14 text-lg font-bold rounded-xl border-2 hover:bg-green-50 hover:text-green-700 hover:border-green-600 transition-colors"
                      onClick={handleWhatsApp}
                    >
                      <Phone className="mr-2 h-5 w-5" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-muted/10">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Sobre el profesional</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/20 overflow-hidden flex-shrink-0 border-2 border-primary/20">
                    {listing.provider.avatarUrl ? (
                      <img src={listing.provider.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full text-primary flex items-center justify-center text-xl font-bold">
                        {listing.provider.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{listing.provider.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      Profesional verificado
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Miembro desde {format(new Date(listing.provider.createdAt), "MMMM yyyy", { locale: es })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

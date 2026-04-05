import { useRoute } from "wouter";
import { useGetListing, useCreateConversation, useGetListingReviews, useCreateBooking, getGetListingQueryKey, getGetListingReviewsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, CheckCircle2, ShieldCheck, MapPin, Calendar, Clock, Star, ShoppingCart, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  const { data: reviews } = useGetListingReviews(listingId, {
    query: {
      enabled: !!listingId,
      queryKey: getGetListingReviewsQueryKey(listingId),
    }
  });

  const { user } = useAuth();
  const createConversation = useCreateConversation();
  const createBooking = useCreateBooking();
  const queryClient = useQueryClient();
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  // Auto-select first variant when listing loads
  useEffect(() => {
    if (listing && (listing as any).sizes?.length > 0 && !selectedVariant) {
      const first = (listing as any).sizes[0];
      setSelectedVariant(first.name || first.size || "");
    }
  }, [listing]);

  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
    ));
  };

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

  const handleBooking = () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (listing?.type === "service" && (listing as any).requiresSchedule && (!bookingDate || !bookingTime)) {
      toast({ title: "Debes seleccionar fecha y hora para agendar el servicio", variant: "destructive" });
      return;
    }
    const scheduledDate = listing?.type === "service" && (listing as any).requiresSchedule && bookingDate && bookingTime
      ? new Date(`${bookingDate}T${bookingTime}`).toISOString()
      : undefined;
    createBooking.mutate(
      { data: { listingId, notes: bookingNotes || undefined, quantity: listing?.type === "product" ? bookingQuantity : undefined, scheduledDate } },
      {
        onSuccess: () => {
          toast({ title: listing?.type === "service" ? "Servicio agendado correctamente" : "Pedido realizado correctamente" });
          setBookingNotes("");
          setBookingQuantity(1);
          setBookingDate("");
          setBookingTime("");
        },
        onError: (err: any) => {
          toast({ title: err?.message || "Error al realizar el pedido", variant: "destructive" });
        }
      }
    );
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
          <div className="flex items-center gap-4 text-muted-foreground text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Publicado el {format(new Date(listing.createdAt), "dd 'de' MMMM, yyyy", { locale: es })}
            </span>
            {averageRating && (
              <span className="flex items-center gap-1 text-yellow-600 font-medium">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {averageRating} ({reviews!.length} {reviews!.length === 1 ? 'reseña' : 'reseñas'})
              </span>
            )}
            {listing.type === "product" && listing.quantity !== null && listing.quantity !== undefined && !(listing as any).sizes?.length && (
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {listing.status === "sold" ? "Agotado" : `${listing.quantity} disponibles`}
              </span>
            )}
            {(listing as any).sizes?.length > 0 && listing.type === "product" && (
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {(listing as any).sizes.reduce((sum: number, s: any) => sum + (s.stock ?? 0), 0)} unidades ({(listing as any).sizes.length} variantes)
              </span>
            )}
            {(listing as any).sizes?.length > 0 && listing.type === "service" && (
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {(listing as any).sizes.length} variantes disponibles
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            {(() => {
              const allImages: string[] = (listing as any).images?.length > 0 
                ? (listing as any).images 
                : listing.imageUrl ? [listing.imageUrl] : [];
              
              if (allImages.length === 0) return null;
              
              return (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 bg-muted aspect-video">
                    <img 
                      src={allImages[currentImageIndex]} 
                      alt={listing.title} 
                      className="w-full h-full object-cover"
                    />
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(i => i === 0 ? allImages.length - 1 : i - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(i => i === allImages.length - 1 ? 0 : i + 1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                          {currentImageIndex + 1} / {allImages.length}
                        </div>
                      </>
                    )}
                  </div>
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                            index === currentImageIndex ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

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

            {/* Reviews Section */}
            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Reseñas y calificaciones</h2>
                {averageRating && (
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(Math.round(parseFloat(averageRating)))}</div>
                    <span className="font-bold text-lg">{averageRating}</span>
                    <span className="text-muted-foreground text-sm">({reviews!.length})</span>
                  </div>
                )}
              </div>
              {!reviews || reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aún no hay reseñas para esta publicación.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                          {review.reviewer?.name?.slice(0, 2).toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{review.reviewer?.name || "Usuario"}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex">{renderStars(review.rating)}</div>
                            <span>·</span>
                            <span>{format(new Date(review.createdAt), "dd MMM yyyy", { locale: es })}</span>
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground/80 mt-2 ml-13">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-2 shadow-lg sticky top-24">
              <CardContent className="p-6">
                <div className="text-4xl font-extrabold text-primary mb-2">
                  {(listing as any).sizes?.length > 0 && selectedVariant ? (
                    <>
                      ${((listing as any).sizes.find((s: any) => (s.name || s.size) === selectedVariant)?.price ?? listing.price).toLocaleString()}
                    </>
                  ) : (
                    <>${listing.price.toLocaleString()}</>
                  )}
                </div>
                {(listing as any).sizes?.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-1">
                    Desde <span className="font-bold text-foreground">${Math.min(...(listing as any).sizes.map((s: any) => s.price)).toLocaleString()}</span>
                    {" "} hasta <span className="font-bold text-foreground">${Math.max(...(listing as any).sizes.map((s: any) => s.price)).toLocaleString()}</span>
                  </p>
                )}
                
                {/* Variants display */}
                {(listing as any).sizes?.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">
                      {(listing as any).variantLabel === "tiempo" ? "Seleccionar período" :
                       (listing as any).variantLabel === "superficie" ? "Seleccionar superficie" :
                       (listing as any).variantLabel === "peso" ? "Seleccionar peso" :
                       (listing as any).variantLabel === "talle" ? "Seleccionar talle" :
                       (listing as any).variantLabel === "color" ? "Seleccionar color" :
                       "Seleccionar variante"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(listing as any).sizes.map((s: any) => {
                        const varName = s.name || s.size || "";
                        const isDisabled = listing.type === "product" && s.stock !== null && s.stock !== undefined && s.stock === 0;
                        return (
                          <button
                            key={varName}
                            type="button"
                            onClick={() => setSelectedVariant(varName)}
                            disabled={isDisabled}
                            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                              selectedVariant === varName 
                                ? 'border-primary bg-primary/10 text-primary' 
                                : isDisabled 
                                  ? 'border-muted bg-muted/50 text-muted-foreground line-through opacity-50 cursor-not-allowed'
                                  : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <span>{varName}</span>
                            <span className="block text-xs font-bold text-primary">${s.price?.toLocaleString()}</span>
                            {listing.type === "product" && s.stock !== null && s.stock !== undefined && (
                              <span className="text-[10px] text-muted-foreground">({s.stock} disp.)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {listing.status === "sold" ? (
                  <div className="text-center py-4 text-muted-foreground font-medium">
                    Este producto ya fue vendido
                  </div>
                ) : user?.role === "admin" ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Como administrador, no puedes comprar ni contratar.
                  </div>
                ) : user?.id !== listing.providerId && (
                  <div className="space-y-4 mb-4">
                    {listing.type === "service" && (listing as any).requiresSchedule && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Fecha del servicio</label>
                          <Input 
                            type="date" 
                            value={bookingDate} 
                            onChange={(e) => setBookingDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Hora</label>
                          <Input 
                            type="time" 
                            value={bookingTime} 
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="h-10"
                          />
                        </div>
                      </div>
                    )}
                    {listing.type === "product" && listing.quantity !== null && listing.quantity !== undefined && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">Cantidad</label>
                        <Input 
                          type="number" 
                          min={1} 
                          max={listing.quantity} 
                          value={bookingQuantity} 
                          onChange={(e) => setBookingQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                          className="h-10"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Notas (opcional)</label>
                      <Textarea 
                        placeholder={listing.type === "service" ? "Detalles del servicio que necesitas..." : "Notas para el vendedor..."} 
                        value={bookingNotes} 
                        onChange={(e) => setBookingNotes(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                    <Button 
                      size="lg" 
                      className="w-full h-14 text-lg font-bold rounded-xl"
                      onClick={handleBooking}
                      disabled={createBooking.isPending}
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {createBooking.isPending ? "Procesando..." : listing.type === "service" ? "Agendar servicio" : "Comprar"}
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-col gap-4">
                  <Button 
                    size="lg" 
                    variant={listing.status === "sold" ? "default" : "outline"}
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
                    {listing.provider.locality && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {listing.provider.locality}
                      </div>
                    )}
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

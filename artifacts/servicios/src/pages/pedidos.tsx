import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetMyBookings, useUpdateBookingStatus, useCreateReview, useUpdateBooking, useCreateConversation, getGetMyBookingsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Star, Package, Clock, CheckCircle2, XCircle, PlayCircle, Truck, MessageSquare, CalendarDays, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  in_progress: { label: "En progreso", color: "bg-purple-100 text-purple-800", icon: <PlayCircle className="w-3.5 h-3.5" /> },
  completed: { label: "Completado", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  delivered: { label: "Entregado", color: "bg-green-100 text-green-800", icon: <Truck className="w-3.5 h-3.5" /> },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function Pedidos() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: bookings, isLoading } = useGetMyBookings();
  const updateStatus = useUpdateBookingStatus();
  const createReview = useCreateReview();
  const updateBooking = useUpdateBooking();
  const createConversation = useCreateConversation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState<{ bookingId: number; listingTitle: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [editDialog, setEditDialog] = useState<{ bookingId: number; scheduledDate: string; scheduledTime: string } | null>(null);

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleStatusUpdate = (bookingId: number, newStatus: string) => {
    updateStatus.mutate(
      { id: bookingId, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBookingsQueryKey() });
          toast({ title: `Estado actualizado a "${STATUS_CONFIG[newStatus]?.label || newStatus}"` });
        },
        onError: (err: any) => {
          toast({ title: err?.message || "Error al actualizar estado", variant: "destructive" });
        }
      }
    );
  };

  const handleSubmitReview = () => {
    if (!reviewDialog) return;
    createReview.mutate(
      { data: { bookingId: reviewDialog.bookingId, rating: reviewRating, comment: reviewComment || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBookingsQueryKey() });
          toast({ title: "Reseña enviada" });
          setReviewDialog(null);
          setReviewRating(5);
          setReviewComment("");
        },
        onError: (err: any) => {
          toast({ title: err?.message || "Error al enviar reseña", variant: "destructive" });
        }
      }
    );
  };

  const handleEditBooking = () => {
    if (!editDialog) return;
    const scheduledDate = editDialog.scheduledDate && editDialog.scheduledTime
      ? new Date(`${editDialog.scheduledDate}T${editDialog.scheduledTime}`).toISOString()
      : editDialog.scheduledDate
        ? new Date(`${editDialog.scheduledDate}T00:00`).toISOString()
        : null;
    updateBooking.mutate(
      { id: editDialog.bookingId, data: { scheduledDate } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBookingsQueryKey() });
          toast({ title: "Fecha actualizada" });
          setEditDialog(null);
        },
        onError: (err: any) => {
          toast({ title: err?.message || "Error al editar", variant: "destructive" });
        }
      }
    );
  };

  const handleStartChatFromBooking = (booking: any) => {
    const otherUserId = booking.clientId;
    createConversation.mutate(
      { data: { providerId: user!.id, listingId: booking.listingId } },
      {
        onSuccess: (conv) => {
          setLocation(`/mensajes/${conv.id}`);
        },
        onError: () => {
          toast({ title: "Error al iniciar chat", variant: "destructive" });
        }
      }
    );
  };

  const myBookingsAsClient = bookings?.filter(b => b.clientId === user.id) || [];
  const myBookingsAsProvider = bookings?.filter(b => b.providerId === user.id) || [];

  const renderBookingCard = (booking: any, isProvider: boolean) => {
    const status = STATUS_CONFIG[booking.status] || { label: booking.status, color: "bg-gray-100 text-gray-800", icon: null };
    const otherUser = isProvider ? booking.client : booking.provider;
    const isCompleted = booking.status === "completed" || booking.status === "delivered";

    return (
      <Card key={booking.id} className="border-2 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-lg line-clamp-1">{booking.listing?.title || "Publicación"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isProvider ? "Cliente" : "Proveedor"}: <span className="font-medium text-foreground">{otherUser?.name || "Usuario"}</span>
                  </p>
                </div>
                <Badge className={`${status.color} flex items-center gap-1 whitespace-nowrap`}>
                  {status.icon}
                  {status.label}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
                {booking.listing?.type === "product" && (
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" /> Cantidad: {booking.quantity}
                  </span>
                )}
                {booking.listing?.price && (
                  <span className="font-medium text-primary">
                    ${(booking.listing.price * (booking.quantity || 1)).toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(booking.createdAt), "dd MMM yyyy", { locale: es })}
                </span>
                {booking.scheduledDate && (
                  <span className="flex items-center gap-1">
                    📅 Agendado: {format(new Date(booking.scheduledDate), "dd MMM yyyy HH:mm", { locale: es })}
                  </span>
                )}
              </div>

              {booking.notes && (
                <p className="text-sm mt-2 bg-muted/30 rounded-lg p-2 text-muted-foreground">
                  {booking.notes}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {/* Provider actions */}
                {isProvider && booking.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => handleStatusUpdate(booking.id, "confirmed")} disabled={updateStatus.isPending}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(booking.id, "cancelled")} disabled={updateStatus.isPending}>
                      <XCircle className="w-4 h-4 mr-1" /> Rechazar
                    </Button>
                  </>
                )}
                {isProvider && booking.status === "confirmed" && (
                  <Button size="sm" onClick={() => handleStatusUpdate(booking.id, "in_progress")} disabled={updateStatus.isPending}>
                    <PlayCircle className="w-4 h-4 mr-1" /> Iniciar
                  </Button>
                )}
                {isProvider && booking.status === "in_progress" && booking.listing?.type === "service" && (
                  <Button size="sm" onClick={() => handleStatusUpdate(booking.id, "completed")} disabled={updateStatus.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Completar
                  </Button>
                )}
                {isProvider && booking.status === "in_progress" && booking.listing?.type === "product" && (
                  <Button size="sm" onClick={() => handleStatusUpdate(booking.id, "delivered")} disabled={updateStatus.isPending}>
                    <Truck className="w-4 h-4 mr-1" /> Entregar
                  </Button>
                )}

                {/* Provider: edit date/time */}
                {isProvider && !["completed", "delivered", "cancelled"].includes(booking.status) && booking.listing?.type === "service" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      const d = booking.scheduledDate ? new Date(booking.scheduledDate) : null;
                      setEditDialog({
                        bookingId: booking.id,
                        scheduledDate: d ? d.toISOString().split("T")[0] : "",
                        scheduledTime: d ? d.toTimeString().slice(0, 5) : "",
                      });
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Editar fecha
                  </Button>
                )}

                {/* Provider: start chat */}
                {isProvider && (
                  <Button size="sm" variant="outline" onClick={() => handleStartChatFromBooking(booking)} disabled={createConversation.isPending}>
                    <MessageSquare className="w-4 h-4 mr-1" /> Chat
                  </Button>
                )}

                {/* Client actions */}
                {!isProvider && booking.status === "pending" && (
                  <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(booking.id, "cancelled")} disabled={updateStatus.isPending}>
                    <XCircle className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                )}
                {!isProvider && isCompleted && (
                  <Button size="sm" variant="outline" onClick={() => setReviewDialog({ bookingId: booking.id, listingTitle: booking.listing?.title || "Publicación" })}>
                    <Star className="w-4 h-4 mr-1" /> Calificar
                  </Button>
                )}

                {/* View listing */}
                {booking.listing && (
                  <Button size="sm" variant="ghost" onClick={() => setLocation(`/servicio/${booking.listingId}`)}>
                    Ver publicación
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Mis Pedidos</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus compras, servicios agendados y solicitudes recibidas.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="as-client">
            <TabsList className="mb-6">
              <TabsTrigger value="as-client">Mis compras ({myBookingsAsClient.length})</TabsTrigger>
              <TabsTrigger value="as-provider">Solicitudes recibidas ({myBookingsAsProvider.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="as-client">
              {myBookingsAsClient.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">No tienes pedidos aún</h2>
                  <p className="text-muted-foreground mb-6">Explora servicios y productos para hacer tu primer pedido.</p>
                  <Button onClick={() => setLocation("/servicios")}>Explorar</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookingsAsClient.map(b => renderBookingCard(b, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="as-provider">
              {myBookingsAsProvider.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">No tienes solicitudes</h2>
                  <p className="text-muted-foreground">Cuando alguien reserve tus servicios o compre tus productos, aparecerán aquí.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookingsAsProvider.map(b => renderBookingCard(b, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calificar: {reviewDialog?.listingTitle}</DialogTitle>
            <DialogDescription>Comparte tu experiencia con otros usuarios.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Calificación</label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => setReviewRating(i + 1)} 
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star className={`w-8 h-8 ${i < reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Comentario (opcional)</label>
              <Textarea 
                placeholder="Cuéntanos tu experiencia..." 
                value={reviewComment} 
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancelar</Button>
            <Button onClick={handleSubmitReview} disabled={createReview.isPending}>
              {createReview.isPending ? "Enviando..." : "Enviar reseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar fecha y hora</DialogTitle>
            <DialogDescription>Modifica la fecha y hora del servicio agendado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha</label>
              <Input 
                type="date" 
                value={editDialog?.scheduledDate || ""} 
                onChange={(e) => setEditDialog(prev => prev ? { ...prev, scheduledDate: e.target.value } : null)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Hora</label>
              <Input 
                type="time" 
                value={editDialog?.scheduledTime || ""} 
                onChange={(e) => setEditDialog(prev => prev ? { ...prev, scheduledTime: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={handleEditBooking} disabled={updateBooking.isPending}>
              {updateBooking.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

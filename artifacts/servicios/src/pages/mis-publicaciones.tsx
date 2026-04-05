import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetMyListings, useUpdateListing, useDeleteListing, getGetMyListingsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { PlusCircle, Edit, Trash2, Eye, ExternalLink, Package, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MisPublicaciones() {
  const { user, isProvider } = useAuth();
  const [, setLocation] = useLocation();
  const { data: listings, isLoading } = useGetMyListings();
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!user || !isProvider) {
    setLocation("/");
    return null;
  }

  const handleToggleActive = (id: number, currentStatus: boolean) => {
    updateListing.mutate(
      { id, data: { isActive: !currentStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
          toast({
            title: currentStatus ? "Publicación pausada" : "Publicación activada",
          });
        },
        onError: () => {
          toast({
            title: "Error al actualizar",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteListing.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
          toast({
            title: "Publicación eliminada",
          });
        },
        onError: () => {
          toast({
            title: "Error al eliminar",
            variant: "destructive"
          });
        }
      }
    );
  };

  const handleMarkAsSold = (id: number) => {
    updateListing.mutate(
      { id, data: { status: "sold", isActive: false } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
          toast({ title: "Publicación marcada como vendida" });
        },
        onError: () => {
          toast({ title: "Error al actualizar", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mis Publicaciones</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus servicios y productos ofrecidos.</p>
          </div>
          <Button asChild size="lg" className="rounded-full">
            <Link href="/publicar">
              <PlusCircle className="mr-2 w-5 h-5" />
              Nueva publicación
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : listings?.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <PlusCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aún no tienes publicaciones</h2>
            <p className="text-muted-foreground mb-6">Crea tu primera publicación para empezar a recibir clientes.</p>
            <Button asChild size="lg">
              <Link href="/publicar">Crear publicación</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {listings?.map((listing) => (
              <div key={listing.id} className={`flex flex-col sm:flex-row gap-6 p-6 rounded-2xl border-2 shadow-sm transition-all ${listing.status === 'sold' ? 'opacity-60 bg-red-50/30' : !listing.isActive ? 'opacity-70 bg-muted/30' : 'bg-card'}`}>
                <div className="w-full sm:w-48 aspect-video sm:aspect-square bg-muted rounded-xl overflow-hidden flex-shrink-0 relative">
                  {listing.imageUrl ? (
                    <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-primary/20 bg-primary/5">
                      {listing.category?.icon || "📦"}
                    </div>
                  )}
                  {listing.status === 'sold' && (
                    <div className="absolute inset-0 bg-red-900/60 backdrop-blur-sm flex items-center justify-center font-bold text-lg text-white">
                      Vendido
                    </div>
                  )}
                  {listing.status !== 'sold' && !listing.isActive && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center font-bold text-lg">
                      Pausado
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{listing.category?.name || "Sin categoría"}</Badge>
                        <Badge variant="outline" className="text-xs bg-background">
                          {listing.type === "service" ? "Servicio" : "Producto"}
                        </Badge>
                        {listing.status === 'sold' && (
                          <Badge variant="destructive" className="text-xs">Vendido</Badge>
                        )}
                        {listing.type === "product" && listing.quantity !== null && listing.quantity !== undefined && listing.status !== 'sold' && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            {listing.quantity} disponibles
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold line-clamp-1">{listing.title}</h3>
                    </div>
                    <div className="font-bold text-xl text-primary whitespace-nowrap">
                      ${listing.price.toLocaleString()}
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                    {listing.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-auto pt-4 border-t">
                    <div className="flex items-center gap-2 mr-auto">
                      {listing.status !== 'sold' && (
                        <>
                          <Switch 
                            checked={listing.isActive} 
                            onCheckedChange={() => handleToggleActive(listing.id, listing.isActive)}
                            id={`switch-${listing.id}`}
                          />
                          <label htmlFor={`switch-${listing.id}`} className="text-sm font-medium cursor-pointer">
                            {listing.isActive ? 'Activo' : 'Pausado'}
                          </label>
                        </>
                      )}
                      {listing.type === "product" && listing.status !== 'sold' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg ml-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => handleMarkAsSold(listing.id)}
                        >
                          <ShoppingBag className="w-4 h-4 mr-1" />
                          Marcar vendido
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild className="rounded-lg">
                        <Link href={`/servicio/${listing.id}`}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver
                        </Link>
                      </Button>
                      <Button variant="secondary" size="sm" asChild className="rounded-lg">
                        <Link href={`/publicar?id=${listing.id}`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente la publicación.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(listing.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

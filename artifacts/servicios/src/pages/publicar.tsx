import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useGetCategories, 
  useCreateListing, 
  useUpdateListing, 
  useGetListing, 
  useUploadImage,
  getGetListingQueryKey
} from "@workspace/api-client-react";
import type { CreateListingBodyType } from "@workspace/api-client-react/src/generated/api.schemas";
import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, Loader2, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia bancaria" },
  { id: "tarjeta", label: "Tarjeta de crédito/débito" }
];

const listingSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
  categoryId: z.coerce.number().min(1, "Selecciona una categoría"),
  type: z.enum(["service", "product"]),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  whatsapp: z.string().optional(),
  paymentMethods: z.array(z.string()).min(1, "Selecciona al menos un método de pago"),
  imageUrl: z.string().optional().nullable(),
});

type ListingFormValues = z.infer<typeof listingSchema>;

export default function Publicar() {
  const { user, isProvider } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const idParam = searchParams.get("id");
  const isEditing = !!idParam;
  const listingId = isEditing ? parseInt(idParam) : 0;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories } = useGetCategories();
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const uploadImage = useUploadImage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: 0,
      type: "service",
      price: 0,
      whatsapp: user?.phone || "",
      paymentMethods: ["efectivo"],
      imageUrl: "",
    },
  });

  const { data: existingListing } = useGetListing(listingId, {
    query: {
      enabled: isEditing,
      queryKey: getGetListingQueryKey(listingId),
    }
  });

  useEffect(() => {
    if (isEditing && existingListing) {
      if (existingListing.providerId !== user?.id) {
        toast({ title: "No tienes permiso para editar esta publicación", variant: "destructive" });
        setLocation("/mis-publicaciones");
        return;
      }
      
      form.reset({
        title: existingListing.title,
        description: existingListing.description,
        categoryId: existingListing.categoryId,
        type: existingListing.type,
        price: existingListing.price,
        whatsapp: existingListing.whatsapp || "",
        paymentMethods: existingListing.paymentMethods,
        imageUrl: existingListing.imageUrl || "",
      });
    }
  }, [existingListing, isEditing, form, user, setLocation, toast]);

  if (!user || !isProvider) {
    setLocation("/");
    return null;
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "El archivo debe ser una imagen", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "La imagen no debe superar los 5MB", variant: "destructive" });
      return;
    }

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        try {
          const result = await uploadImage.mutateAsync({
            data: {
              base64,
              filename: file.name
            }
          });
          form.setValue("imageUrl", result.url);
          toast({ title: "Imagen subida correctamente" });
        } catch (error) {
          toast({ title: "Error al subir la imagen", variant: "destructive" });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast({ title: "Error al procesar la imagen", variant: "destructive" });
    }
  };

  const onSubmit = (data: ListingFormValues) => {
    const payload = {
      ...data,
      imageUrl: data.imageUrl || undefined,
      whatsapp: data.whatsapp || undefined,
    };

    if (isEditing) {
      updateListing.mutate(
        { id: listingId, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetListingQueryKey(listingId) });
            toast({ title: "Publicación actualizada" });
            setLocation("/mis-publicaciones");
          },
          onError: () => {
            toast({ title: "Error al actualizar", variant: "destructive" });
          }
        }
      );
    } else {
      createListing.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Publicación creada con éxito" });
            setLocation("/mis-publicaciones");
          },
          onError: () => {
            toast({ title: "Error al crear", variant: "destructive" });
          }
        }
      );
    }
  };

  const imageUrl = form.watch("imageUrl");
  const isPending = createListing.isPending || updateListing.isPending;

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button variant="ghost" onClick={() => setLocation("/mis-publicaciones")} className="mb-4 -ml-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a mis publicaciones
          </Button>
          <h1 className="text-3xl font-bold">{isEditing ? 'Editar Publicación' : 'Crear Nueva Publicación'}</h1>
          <p className="text-muted-foreground mt-1">Completa los detalles para publicar tu servicio o producto.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">Información básica</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título de la publicación</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Instalación de aire acondicionado" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(parseInt(v))} 
                          value={field.value ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                <span className="flex items-center gap-2">
                                  <span>{cat.icon}</span>
                                  <span>{cat.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de publicación</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0 bg-muted/30 p-3 rounded-lg border flex-1">
                              <FormControl>
                                <RadioGroupItem value="service" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer w-full">Servicio</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0 bg-muted/30 p-3 rounded-lg border flex-1">
                              <FormControl>
                                <RadioGroupItem value="product" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer w-full">Producto</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción detallada</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe tu servicio o producto en detalle. Qué incluye, cómo trabajas, etc." 
                          className="min-h-[150px] resize-y" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">Imagen principal</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  
                  {imageUrl ? (
                    <div className="relative w-full max-w-md aspect-video rounded-xl overflow-hidden border-2 shadow-sm group">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          Cambiar imagen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="w-full max-w-md aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-sm font-medium">Subiendo imagen...</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium">Haz clic para subir una foto</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Hidden field to keep imageUrl in form state */}
                  <input type="hidden" {...form.register("imageUrl")} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-sm">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg">Precios y Contacto</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio ($)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">$</span>
                            <Input type="number" min="0" placeholder="0" {...field} className="h-12 pl-8 text-lg font-bold" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} className="h-12" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentMethods"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Métodos de pago aceptados</FormLabel>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {PAYMENT_METHODS.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="paymentMethods"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 bg-muted/10"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer leading-snug">
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" size="lg" onClick={() => setLocation("/mis-publicaciones")}>
                Cancelar
              </Button>
              <Button type="submit" size="lg" className="min-w-[200px]" disabled={isPending || isUploading}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar cambios" : "Publicar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}

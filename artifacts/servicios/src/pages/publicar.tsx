import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSEO } from "@/hooks/use-seo";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useGetCategories, 
  useCreateListing, 
  useUpdateListing, 
  useGetListing, 
  useUploadImage,
  getGetListingQueryKey
} from "@workspace/api-client-react";
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
import { Image as ImageIcon, Loader2, ArrowLeft, X, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { imgUrl } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "tarjeta", label: "Tarjeta" }
];

const VARIANT_LABELS_SERVICE = [
  { value: "tiempo", label: "Tiempo", placeholders: ["1 día", "7 días", "15 días", "1 mes", "3 meses", "6 meses", "1 año"] },
  { value: "superficie", label: "Superficie (m²)", placeholders: ["Hasta 20 m²", "Hasta 50 m²", "Hasta 100 m²"] },
  { value: "peso", label: "Peso (kg)", placeholders: ["Hasta 5 kg", "Hasta 10 kg", "Hasta 25 kg"] },
  { value: "custom", label: "Personalizado", placeholders: [] },
];

const VARIANT_LABELS_PRODUCT = [
  { value: "talle", label: "Talle", placeholders: ["XS", "S", "M", "L", "XL", "XXL"] },
  { value: "peso", label: "Peso (kg)", placeholders: ["250g", "500g", "1 kg", "5 kg"] },
  { value: "color", label: "Color", placeholders: ["Negro", "Blanco", "Rojo", "Azul"] },
  { value: "custom", label: "Personalizado", placeholders: [] },
];

const listingSchema = z.object({
  title: z.string().min(5, "Mínimo 5 caracteres"),
  description: z.string().min(20, "Mínimo 20 caracteres"),
  categoryId: z.coerce.number().min(1, "Selecciona una categoría"),
  type: z.enum(["service", "product"]),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  quantity: z.coerce.number().min(1).optional().nullable(),
  whatsapp: z.string().optional(),
  paymentMethods: z.array(z.string()).min(1, "Selecciona al menos uno"),
  imageUrl: z.string().optional().nullable(),
});

type ListingFormValues = z.infer<typeof listingSchema>;

type Variant = { name: string; price: number; stock: number | null };

export default function Publicar() {
  useSEO({ title: "Publicar Servicio o Producto", noindex: true });
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
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantLabel, setVariantLabel] = useState("");
  const [requiresSchedule, setRequiresSchedule] = useState(false);
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrice, setNewVarPrice] = useState<number>(0);
  const [newVarStock, setNewVarStock] = useState<number>(0);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: 0,
      type: "service",
      price: 0,
      quantity: null,
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
        quantity: existingListing.quantity ?? null,
        whatsapp: existingListing.whatsapp || "",
        paymentMethods: existingListing.paymentMethods,
        imageUrl: existingListing.imageUrl || "",
      });
      
      const existingImages = (existingListing as any).images;
      if (existingImages && Array.isArray(existingImages) && existingImages.length > 0) {
        setImages(existingImages);
      } else if (existingListing.imageUrl) {
        setImages([existingListing.imageUrl]);
      }
      
      const existingSizes = (existingListing as any).sizes;
      if (existingSizes && Array.isArray(existingSizes)) {
        setVariants(existingSizes.map((s: any) => ({
          name: s.name || s.size || "",
          price: s.price ?? existingListing.price,
          stock: s.stock ?? null,
        })));
      }
      
      const existingLabel = (existingListing as any).variantLabel;
      if (existingLabel) setVariantLabel(existingLabel);
      
      const existingSchedule = (existingListing as any).requiresSchedule;
      if (existingSchedule) setRequiresSchedule(true);
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
        const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
        try {
          const result = await uploadImage.mutateAsync({ data: { base64: pureBase64, filename: file.name } });
          setImages(prev => [...prev, result.url]);
          if (images.length === 0) form.setValue("imageUrl", result.url);
          toast({ title: "Imagen subida" });
        } catch { toast({ title: "Error al subir la imagen", variant: "destructive" }); }
        finally { setIsUploading(false); }
      };
      reader.readAsDataURL(file);
    } catch { setIsUploading(false); toast({ title: "Error al procesar la imagen", variant: "destructive" }); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      form.setValue("imageUrl", newImages[0] || "");
      return newImages;
    });
  };

  const addVariant = () => {
    if (!newVarName.trim()) { toast({ title: "Ingresa un nombre para la variante", variant: "destructive" }); return; }
    if (variants.some(v => v.name.toLowerCase() === newVarName.trim().toLowerCase())) { toast({ title: "Esa variante ya existe", variant: "destructive" }); return; }
    if (newVarPrice <= 0) { toast({ title: "El precio debe ser mayor a 0", variant: "destructive" }); return; }
    setVariants(prev => [...prev, { name: newVarName.trim(), price: newVarPrice, stock: selectedType === "product" ? Math.max(0, newVarStock) : null }]);
    setNewVarName("");
    setNewVarPrice(0);
    setNewVarStock(0);
  };

  const removeVariant = (index: number) => setVariants(prev => prev.filter((_, i) => i !== index));

  const updateVariant = (index: number, field: keyof Variant, value: string | number | null) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const onSubmit = (data: ListingFormValues) => {
    const hasVariants = variants.length > 0;
    
    if (!hasVariants && data.price <= 0) {
      toast({ title: "Ingresa un precio válido", variant: "destructive" });
      return;
    }
    
    const payload: any = {
      ...data,
      imageUrl: images[0] || undefined,
      images: images,
      whatsapp: data.whatsapp || undefined,
      pricingType: "unit",
      sizes: hasVariants ? variants : undefined,
      variantLabel: hasVariants ? variantLabel : undefined,
      requiresSchedule: data.type === "service" ? requiresSchedule : undefined,
      quantity: data.type === "product" && !hasVariants ? (data.quantity ?? undefined) : undefined,
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
          onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
        }
      );
    } else {
      createListing.mutate(
        { data: payload },
        {
          onSuccess: () => { toast({ title: "Publicación creada con éxito" }); setLocation("/mis-publicaciones"); },
          onError: () => toast({ title: "Error al crear", variant: "destructive" }),
        }
      );
    }
  };

  const selectedType = form.watch("type");
  const isPending = createListing.isPending || updateListing.isPending;
  const filteredCategories = categories?.filter((cat) => cat.type === selectedType);
  const variantOptions = selectedType === "service" ? VARIANT_LABELS_SERVICE : VARIANT_LABELS_PRODUCT;
  const currentVarOption = variantOptions.find(v => v.value === variantLabel);

  return (
    <Layout>
      <div className="bg-muted/30 py-4 border-b">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/mis-publicaciones")} className="-ml-2 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Publicación' : 'Nueva Publicación'}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Info */}
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Información básica</h3>
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("categoryId", 0);
                          setVariants([]);
                          setVariantLabel("");
                        }}
                        value={field.value}
                        className="flex gap-3"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0 bg-muted/30 px-3 py-2 rounded-lg border flex-1">
                          <FormControl><RadioGroupItem value="service" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer w-full text-sm">Servicio</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0 bg-muted/30 px-3 py-2 rounded-lg border flex-1">
                          <FormControl><RadioGroupItem value="product" /></FormControl>
                          <FormLabel className="font-normal cursor-pointer w-full text-sm">Producto</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Categoría</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[220px]">
                          {filteredCategories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              <span className="flex items-center gap-1.5">
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
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs">Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Instalación de aire acondicionado" {...field} className="h-9" />
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
                    <FormLabel className="text-xs">Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe tu servicio o producto en detalle..." className="min-h-[80px] resize-y text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Photos */}
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Fotos {images.length > 0 && <span className="normal-case font-normal">({images.length}/10)</span>}
              </h3>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              
              {images.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group">
                      <img src={imgUrl(url)} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      {index === 0 && <Badge className="absolute top-1 left-1 text-[9px] px-1.5 py-0">Principal</Badge>}
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 10 && (
                    <div className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => fileInputRef.current?.click()}>
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <>
                        <Plus className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Agregar</span>
                      </>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-28 rounded-lg border-2 border-dashed flex items-center justify-center gap-3 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  {isUploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-sm">Subiendo...</span></>
                  ) : (
                    <><ImageIcon className="w-6 h-6 text-muted-foreground" /><div className="text-sm"><span className="font-medium">Subir fotos</span><span className="text-muted-foreground ml-1">· Máx 10, hasta 5MB</span></div></>
                  )}
                </div>
              )}
              <input type="hidden" {...form.register("imageUrl")} />
            </div>

            {/* Price & Contact */}
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Precio y contacto</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {variants.length > 0 ? "Precio base ($)" : "Precio ($)"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <Input type="number" min="0" step="0.01" placeholder="0" {...field} className="h-9 pl-7 font-bold" />
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
                      <FormLabel className="text-xs">WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+54..." {...field} className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === "product" && variants.length === 0 && (
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Stock</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" min="1" placeholder="Cant." 
                            value={field.value ?? ""} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                            className="h-9" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="paymentMethods"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-xs">Métodos de pago</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_METHODS.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="paymentMethods"
                          render={({ field }) => (
                            <FormItem key={item.id} className="flex items-center space-x-1.5 space-y-0 rounded-md border px-2.5 py-1.5 bg-muted/10">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => checked ? field.onChange([...field.value, item.id]) : field.onChange(field.value?.filter((v) => v !== item.id))}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer text-sm">{item.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType === "service" && (
                <div className="flex items-center space-x-2 rounded-md border px-3 py-2.5 bg-muted/10">
                  <Checkbox
                    id="requiresSchedule"
                    checked={requiresSchedule}
                    onCheckedChange={(checked) => setRequiresSchedule(!!checked)}
                  />
                  <Label htmlFor="requiresSchedule" className="font-normal cursor-pointer text-sm">
                    El cliente debe elegir fecha y hora al contratar
                  </Label>
                </div>
              )}
            </div>

            {/* Variants */}
            <div className="bg-card rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Variantes <span className="normal-case font-normal">(opcional)</span>
                </h3>
                {variants.length > 0 && (
                  <Badge variant="outline" className="text-xs">{variants.length} variante{variants.length !== 1 ? "s" : ""}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedType === "service" 
                  ? "Define variantes con distintos precios: por tiempo, superficie, peso, etc."
                  : "Define variantes con precio y stock: talles, pesos, colores, etc."
                }
              </p>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Tipo de variante</Label>
                  <Select value={variantLabel} onValueChange={(v) => { setVariantLabel(v); setVariants([]); }}>
                    <SelectTrigger className="h-9 mt-0.5">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {variantOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {variantLabel && currentVarOption?.placeholders && currentVarOption.placeholders.length > 0 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-9 text-xs"
                    onClick={() => {
                      const basePrice = form.getValues("price") || 0;
                      const newVars = currentVarOption.placeholders
                        .filter(p => !variants.some(v => v.name === p))
                        .map((p, i) => ({
                          name: p,
                          price: basePrice > 0 ? Math.round(basePrice * (1 + i * 0.5)) : 0,
                          stock: selectedType === "product" ? 0 : null,
                        }));
                      if (newVars.length > 0) setVariants(prev => [...prev, ...newVars]);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Sugeridos
                  </Button>
                )}
              </div>

              {variantLabel && (
                <>
                  {variants.length > 0 && (
                    <div className="space-y-1.5">
                      {variants.map((v, index) => (
                        <div key={index} className="flex items-center gap-2 bg-muted/20 rounded-lg px-2.5 py-1.5 border">
                          <span className="font-medium text-sm min-w-[80px] truncate">{v.name}</span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-xs text-muted-foreground">$</span>
                            <Input 
                              type="number" min="0" step="0.01"
                              value={v.price} 
                              onChange={(e) => updateVariant(index, "price", parseFloat(e.target.value) || 0)} 
                              className="h-7 w-24 text-sm"
                            />
                          </div>
                          {selectedType === "product" && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Stock:</span>
                              <Input 
                                type="number" min="0" 
                                value={v.stock ?? 0} 
                                onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value) || 0)} 
                                className="h-7 w-16 text-sm"
                              />
                            </div>
                          )}
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeVariant(index)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      {selectedType === "product" && (
                        <div className="text-xs text-muted-foreground">
                          Stock total: <span className="font-bold text-foreground">{variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-end gap-2 pt-1 border-t">
                    <div className="flex-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input 
                        placeholder={currentVarOption?.placeholders?.[0] || "Ej. Variante A"} 
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        className="h-8 text-sm mt-0.5"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariant(); } }}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Precio</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <Input 
                          type="number" min="0" step="0.01"
                          value={newVarPrice || ""}
                          onChange={(e) => setNewVarPrice(parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm pl-5 mt-0.5"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariant(); } }}
                        />
                      </div>
                    </div>
                    {selectedType === "product" && (
                      <div className="w-20">
                        <Label className="text-xs">Stock</Label>
                        <Input 
                          type="number" min="0"
                          value={newVarStock || ""}
                          onChange={(e) => setNewVarStock(parseInt(e.target.value) || 0)}
                          className="h-8 text-sm mt-0.5"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariant(); } }}
                        />
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={addVariant}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setLocation("/mis-publicaciones")}>Cancelar</Button>
              <Button type="submit" className="min-w-[160px]" disabled={isPending || isUploading}>
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

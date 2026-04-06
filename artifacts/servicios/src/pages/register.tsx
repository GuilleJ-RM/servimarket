import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingBag, User as UserIcon, Store, Building2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ARGENTINA_PROVINCES = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

const registerSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
  role: z.enum(["client", "provider", "company"]),
  locality: z.string().optional(),
  companyName: z.string().optional(),
  cuit: z.string().optional(),
  companyAddress: z.string().optional(),
  companyIndustry: z.string().optional(),
}).refine(
  (data) => data.role !== "provider" || (data.locality && data.locality.length > 0),
  { message: "La provincia es obligatoria para proveedores", path: ["locality"] }
).refine(
  (data) => data.role !== "company" || (data.companyName && data.companyName.length > 0),
  { message: "El nombre de la empresa es obligatorio", path: ["companyName"] }
).refine(
  (data) => data.role !== "company" || (data.cuit && data.cuit.length > 0),
  { message: "El CUIT es obligatorio", path: ["cuit"] }
);

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "client",
      locality: "",
      companyName: "",
      cuit: "",
      companyAddress: "",
      companyIndustry: "",
    },
  });

  const selectedRole = form.watch("role");

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Cuenta creada exitosamente",
            description: "Bienvenido a ServiMarket",
          });
          window.location.href = "/";
        },
        onError: (error: any) => {
          toast({
            title: "Error al registrarse",
            description: error?.data?.error || "Ha ocurrido un error inesperado",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center p-4 bg-muted/30 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-90">
            <ShoppingBag className="w-8 h-8" />
            ServiMarket
          </Link>
        </div>
        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Crear una cuenta</CardTitle>
            <CardDescription>
              Únete a nuestra comunidad de profesionales y clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>¿Qué buscas en ServiMarket?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-3"
                        >
                          <div>
                            <RadioGroupItem
                              value="client"
                              id="client"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="client"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                            >
                              <UserIcon className="mb-2 h-6 w-6" />
                              <span className="font-semibold">Soy Cliente</span>
                              <span className="text-xs text-muted-foreground text-center mt-1">Busco servicios</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="provider"
                              id="provider"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="provider"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                            >
                              <Store className="mb-2 h-6 w-6" />
                              <span className="font-semibold text-sm">Profesional</span>
                              <span className="text-xs text-muted-foreground text-center mt-1">Ofrezco servicios</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem
                              value="company"
                              id="company"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="company"
                              className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                            >
                              <Building2 className="mb-2 h-6 w-6" />
                              <span className="font-semibold text-sm">Empresa</span>
                              <span className="text-xs text-muted-foreground text-center mt-1">Publico vacantes</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@correo.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+123456789" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRole === "provider" && (
                  <FormField
                    control={form.control}
                    name="locality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona tu provincia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[220px]">
                            {ARGENTINA_PROVINCES.map((province) => (
                              <SelectItem key={province} value={province}>
                                {province}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedRole === "company" && (
                  <>
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la empresa *</FormLabel>
                          <FormControl>
                            <Input placeholder="Mi Empresa S.A." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cuit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CUIT *</FormLabel>
                          <FormControl>
                            <Input placeholder="20-12345678-9" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="companyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Corrientes 1234, CABA" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="locality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provincia</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Provincia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[220px]">
                                {ARGENTINA_PROVINCES.map((province) => (
                                  <SelectItem key={province} value={province}>
                                    {province}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="companyIndustry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rubro</FormLabel>
                            <FormControl>
                              <Input placeholder="Tecnología" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      Las cuentas de empresa requieren aprobación del administrador antes de poder publicar vacantes.
                    </p>
                  </>
                )}
                
                <Button type="submit" className="w-full font-semibold" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Registrando..." : "Crear cuenta"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center">
            <div className="text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Inicia sesión aquí
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

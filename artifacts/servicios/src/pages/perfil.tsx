import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useUpdateProfile, useUploadImage, getGetMeQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, User, Bell, Mail, Phone, FileText } from "lucide-react";
import { useRef, useState } from "react";

const profileSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  phone: z.string().optional().nullable(),
  locality: z.string().optional().nullable(),
  notifyEmail: z.boolean(),
  cvPublic: z.boolean(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Perfil() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const updateProfile = useUpdateProfile();
  const uploadImage = useUploadImage();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      locality: user?.locality || "",
      notifyEmail: user?.notifyEmail ?? true,
      cvPublic: user?.cvPublic ?? false,
    },
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no puede superar 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setAvatarPreview(reader.result as string);

      try {
        const result = await uploadImage.mutateAsync({ data: { base64, filename: file.name } });
        await updateProfile.mutateAsync({ data: { avatarUrl: result.url } });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Foto actualizada" });
      } catch {
        toast({ title: "Error al subir la foto", variant: "destructive" });
        setAvatarPreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        data: {
          name: data.name,
          phone: data.phone || null,
          locality: data.locality || null,
          notifyEmail: data.notifyEmail,
          cvPublic: data.cvPublic,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast({ title: "Perfil actualizado" });
    } catch {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "El CV no puede superar 10MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const result = await uploadImage.mutateAsync({ data: { base64, filename: file.name } });
        await updateProfile.mutateAsync({ data: { cvUrl: result.url } });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "CV subido correctamente" });
      } catch {
        toast({ title: "Error al subir el CV", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const displayAvatar = avatarPreview || (user.avatarUrl ? (user.avatarUrl.startsWith("/api") ? user.avatarUrl : `/api${user.avatarUrl}`) : undefined);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Mi perfil</h1>

        {/* Avatar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Foto de perfil</CardTitle>
            <CardDescription>Esta foto aparecerá como logo en tus publicaciones</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="w-24 h-24 cursor-pointer border-2 border-primary/20" onClick={() => fileInputRef.current?.click()}>
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Cambiar foto
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Máx 5MB.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </CardContent>
        </Card>

        {/* Profile form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Información personal</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="+54 9 11 1234-5678" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localidad</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Tu ciudad" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* CV section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Curriculum Vitae</CardTitle>
            <CardDescription>Subí tu CV para postularte a vacantes sin tener que adjuntarlo cada vez</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user.cvUrl ? (
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1">
                    <FileText className="w-3 h-3" /> CV cargado
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href={user.cvUrl.startsWith("/api") ? user.cvUrl : `/api${user.cvUrl}`} target="_blank" rel="noopener noreferrer">
                      Ver CV
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tenés un CV cargado</p>
              )}
              <Button variant="outline" size="sm" onClick={() => cvInputRef.current?.click()}>
                {user.cvUrl ? "Cambiar CV" : "Subir CV"}
              </Button>
              <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCvUpload} />
            </div>
            <Form {...form}>
              <FormField
                control={form.control}
                name="cvPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">CV público</FormLabel>
                      <FormDescription>Permitir que las empresas vean tu CV al buscar candidatos</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          form.handleSubmit(onSubmit)();
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </Form>
          </CardContent>
        </Card>

        {/* Notification settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notificaciones</CardTitle>
            <CardDescription>Elige cómo recibir notificaciones cuando te lleguen mensajes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notifyEmail"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2 text-base"><Mail className="w-4 h-4" /> Email</FormLabel>
                        <FormDescription>Recibir notificaciones de mensajes por email</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            form.handleSubmit(onSubmit)();
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

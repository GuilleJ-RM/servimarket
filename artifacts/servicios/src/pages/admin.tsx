import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/layout";
import {
  useAdminGetStats,
  useAdminGetUsers,
  useAdminGetListings,
  useAdminDeleteListing,
  useGetCategories,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
  useAdminUpdateUser,
  useAdminDeleteUser,
  useCreateConversation,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Trash2,
  Briefcase,
  FolderOpen,
  Plus,
  Pencil,
  MapPin,
  Phone,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const ARGENTINA_PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
];

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useAdminGetStats();
  const { data: users, isLoading: usersLoading } = useAdminGetUsers();
  const { data: listings, isLoading: listingsLoading } = useAdminGetListings();
  const { data: categories, isLoading: categoriesLoading } = useGetCategories();

  const deleteMutation = useAdminDeleteListing();
  const createCategoryMutation = useAdminCreateCategory();
  const updateCategoryMutation = useAdminUpdateCategory();
  const deleteCategoryMutation = useAdminDeleteCategory();
  const updateUserMutation = useAdminUpdateUser();
  const deleteUserMutation = useAdminDeleteUser();
  const createConversation = useCreateConversation();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string; icon: string; type: string; description: string } | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "", type: "service" as string, description: "" });

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "", phone: "", locality: "" });

  if (!user || !isAdmin) {
    setLocation("/");
    return null;
  }

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`¿Eliminar la publicación "${title}"?`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Publicación eliminada", description: `"${title}" fue eliminada correctamente.` });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
        onError: () => {
          toast({ title: "Error", description: "No se pudo eliminar la publicación.", variant: "destructive" });
        },
      }
    );
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", icon: "", type: "service", description: "" });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: { id: number; name: string; icon?: string | null; type: string; description?: string | null }) => {
    setEditingCategory({ id: cat.id, name: cat.name, icon: cat.icon ?? "", type: cat.type, description: cat.description ?? "" });
    setCategoryForm({ name: cat.name, icon: cat.icon ?? "", type: cat.type, description: cat.description ?? "" });
    setCategoryDialogOpen(true);
  };

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim() || !categoryForm.icon.trim()) {
      toast({ title: "Error", description: "Nombre e ícono son obligatorios.", variant: "destructive" });
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate(
        { id: editingCategory.id, data: { name: categoryForm.name, icon: categoryForm.icon, type: categoryForm.type as any, description: categoryForm.description || null } },
        {
          onSuccess: () => {
            toast({ title: "Categoría actualizada" });
            invalidateCategories();
            setCategoryDialogOpen(false);
          },
          onError: () => {
            toast({ title: "Error", description: "No se pudo actualizar la categoría.", variant: "destructive" });
          },
        }
      );
    } else {
      createCategoryMutation.mutate(
        { data: { name: categoryForm.name, icon: categoryForm.icon, type: categoryForm.type as any, description: categoryForm.description || undefined } },
        {
          onSuccess: () => {
            toast({ title: "Categoría creada" });
            invalidateCategories();
            setCategoryDialogOpen(false);
          },
          onError: () => {
            toast({ title: "Error", description: "No se pudo crear la categoría.", variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDeleteCategory = (id: number, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Solo se puede si no tiene publicaciones asociadas.`)) return;
    deleteCategoryMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Categoría eliminada", description: `"${name}" fue eliminada.` });
          invalidateCategories();
        },
        onError: () => {
          toast({ title: "Error", description: "No se pudo eliminar. Puede tener publicaciones asociadas.", variant: "destructive" });
        },
      }
    );
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      phone: u.phone || "",
      locality: u.locality || "",
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    const data: any = {};
    if (userForm.name && userForm.name !== editingUser.name) data.name = userForm.name;
    if (userForm.email && userForm.email !== editingUser.email) data.email = userForm.email;
    if (userForm.password) data.password = userForm.password;
    if (userForm.role && userForm.role !== editingUser.role) data.role = userForm.role;
    if (userForm.phone !== (editingUser.phone || "")) data.phone = userForm.phone || null;
    if (userForm.locality !== (editingUser.locality || "")) data.locality = userForm.locality || null;

    if (Object.keys(data).length === 0) {
      setUserDialogOpen(false);
      return;
    }

    updateUserMutation.mutate(
      { id: editingUser.id, data },
      {
        onSuccess: () => {
          toast({ title: "Usuario actualizado" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
          setUserDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Error", description: "No se pudo actualizar el usuario.", variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteUser = (id: number, name: string) => {
    if (!confirm(`¿Eliminar al usuario "${name}"? Se eliminarán todas sus publicaciones, conversaciones y reservas.`)) return;
    deleteUserMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Usuario eliminado", description: `"${name}" fue eliminado.` });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message || "No se pudo eliminar el usuario.", variant: "destructive" });
        },
      }
    );
  };

  const handleStartChat = (targetUser: any) => {
    createConversation.mutate(
      { data: { providerId: targetUser.id } },
      {
        onSuccess: (conv) => {
          setLocation(`/mensajes/${conv.id}`);
        },
        onError: () => {
          toast({ title: "Error al iniciar conversación", variant: "destructive" });
        },
      }
    );
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return <Badge variant="destructive">Admin</Badge>;
      case "provider": return <Badge variant="default">Proveedor</Badge>;
      case "client": return <Badge variant="secondary">Cliente</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="bg-muted/30 py-6 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona usuarios, publicaciones y categorías</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Usuarios</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{stats?.totalProviders ?? 0} prov · {stats?.totalClients ?? 0} cli</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Publicaciones</p>
                  <p className="text-2xl font-bold">{stats?.totalListings ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{stats?.activeListings ?? 0} activas</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Conversaciones</p>
                  <p className="text-2xl font-bold">{stats?.totalConversations ?? "—"}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Mensajes</p>
                  <p className="text-2xl font-bold">{stats?.totalMessages ?? "—"}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5" /> Usuarios
            </TabsTrigger>
            <TabsTrigger value="listings" className="gap-1.5 text-xs sm:text-sm">
              <ShoppingBag className="h-3.5 w-3.5" /> Publicaciones
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm">
              <FolderOpen className="h-3.5 w-3.5" /> Categorías
            </TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Usuarios Registrados ({users?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <p className="text-muted-foreground p-6">Cargando...</p>
                ) : !users?.length ? (
                  <p className="text-muted-foreground text-center p-8">No hay usuarios.</p>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">ID</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Provincia</TableHead>
                            <TableHead>Registro</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="text-xs text-muted-foreground">{u.id}</TableCell>
                              <TableCell className="font-medium text-sm">{u.name}</TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell>{roleLabel(u.role)}</TableCell>
                              <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                              <TableCell className="text-sm">{u.locality || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("es")}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(u)} title="Editar">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  {u.id !== user!.id && (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartChat(u)} disabled={createConversation.isPending} title="Chat">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteUser(u.id, u.name)} disabled={deleteUserMutation.isPending} title="Eliminar">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3 p-4">
                      {users.map((u) => (
                        <div key={u.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            {roleLabel(u.role)}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {u.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone}</span>}
                            {u.locality && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {u.locality}</span>}
                            <span>ID: {u.id} · {new Date(u.createdAt).toLocaleDateString("es")}</span>
                          </div>
                          <div className="flex gap-1 pt-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditUser(u)}>
                              <Pencil className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            {u.id !== user!.id && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStartChat(u)} disabled={createConversation.isPending}>
                                  <MessageSquare className="h-3 w-3 mr-1" /> Chat
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDeleteUser(u.id, u.name)} disabled={deleteUserMutation.isPending}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LISTINGS TAB */}
          <TabsContent value="listings" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Publicaciones ({listings?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {listingsLoading ? (
                  <p className="text-muted-foreground p-6">Cargando...</p>
                ) : !listings?.length ? (
                  <p className="text-muted-foreground text-center p-8">No hay publicaciones.</p>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">ID</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listings.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs text-muted-foreground">{l.id}</TableCell>
                              <TableCell className="font-medium text-sm max-w-[200px] truncate">{l.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {l.type === "service" ? "Servicio" : "Producto"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">${l.price.toLocaleString()}</TableCell>
                              <TableCell className="text-sm">{l.provider?.name ?? "—"}</TableCell>
                              <TableCell className="text-sm">{l.category?.icon} {l.category?.name ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={l.isActive ? "default" : "secondary"} className="text-xs">
                                  {l.isActive ? "Activa" : "Inactiva"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation(`/servicio/${l.id}`)} title="Ver">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(l.id, l.title)} disabled={deleteMutation.isPending} title="Eliminar">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3 p-4">
                      {listings.map((l) => (
                        <div key={l.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{l.title}</p>
                              <p className="text-xs text-muted-foreground">{l.category?.icon} {l.category?.name} · {l.provider?.name}</p>
                            </div>
                            <span className="text-sm font-bold text-primary whitespace-nowrap">${l.price.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{l.type === "service" ? "Servicio" : "Producto"}</Badge>
                            <Badge variant={l.isActive ? "default" : "secondary"} className="text-xs">{l.isActive ? "Activa" : "Inactiva"}</Badge>
                          </div>
                          <div className="flex gap-1 pt-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLocation(`/servicio/${l.id}`)}>
                              <Eye className="h-3 w-3 mr-1" /> Ver
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(l.id, l.title)} disabled={deleteMutation.isPending}>
                              <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg">Categorías</CardTitle>
                <Button onClick={openCreateCategory} size="sm" className="gap-1.5 h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Nueva
                </Button>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                {categoriesLoading ? (
                  <p className="text-muted-foreground">Cargando...</p>
                ) : !categories?.length ? (
                  <p className="text-muted-foreground text-center py-8">No hay categorías creadas aún.</p>
                ) : (
                  <>
                    {["service", "product"].map((catType) => {
                      const filtered = categories.filter(c => c.type === catType);
                      if (filtered.length === 0) return null;
                      return (
                        <div key={catType}>
                          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                            {catType === "service" ? <Briefcase className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                            {catType === "service" ? "Servicios" : "Productos"}
                            <Badge variant="outline" className="text-xs">{filtered.length}</Badge>
                          </h3>

                          {/* Desktop */}
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">ID</TableHead>
                                  <TableHead className="w-16">Ícono</TableHead>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead>Descripción</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filtered.map((cat) => (
                                  <TableRow key={cat.id}>
                                    <TableCell className="text-xs text-muted-foreground">{cat.id}</TableCell>
                                    <TableCell className="text-xl">{cat.icon}</TableCell>
                                    <TableCell className="font-medium text-sm">{cat.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{cat.description || "—"}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCategory(cat)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={deleteCategoryMutation.isPending}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile */}
                          <div className="md:hidden space-y-2">
                            {filtered.map((cat) => (
                              <div key={cat.id} className="border rounded-lg p-3 flex items-center gap-3">
                                <span className="text-2xl">{cat.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{cat.name}</p>
                                  {cat.description && <p className="text-xs text-muted-foreground truncate">{cat.description}</p>}
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCategory(cat)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input placeholder="Ej: Plomería" value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ícono *</Label>
                <Input placeholder="🔧" value={categoryForm.icon} onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))} className="text-center text-lg" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo *</Label>
              <Select value={categoryForm.type} onValueChange={(val) => setCategoryForm((f) => ({ ...f, type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Servicio</SelectItem>
                  <SelectItem value="product">Producto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea placeholder="Descripción opcional" value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
              {editingCategory ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica los datos del usuario. Deja la contraseña vacía para no cambiarla.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rol</Label>
                <Select value={userForm.role} onValueChange={(val) => setUserForm((f) => ({ ...f, role: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="provider">Proveedor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nueva contraseña (opcional)</Label>
              <Input type="password" placeholder="Dejar vacío para no cambiar" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input value={userForm.phone} onChange={(e) => setUserForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Provincia</Label>
                <Select value={userForm.locality || "none"} onValueChange={(val) => setUserForm((f) => ({ ...f, locality: val === "none" ? "" : val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin provincia" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    <SelectItem value="none">Sin provincia</SelectItem>
                    {ARGENTINA_PROVINCES.map((prov) => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

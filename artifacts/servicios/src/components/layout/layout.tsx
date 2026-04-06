import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  Search, 
  MessageSquare, 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  ListPlus, 
  PlusCircle,
  ShoppingBag,
  Shield,
  Headphones,
  ClipboardList,
  Briefcase,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCreateSupportConversation, useGetConversations, getGetConversationsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isProvider, isAdmin, isCompany } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const supportMutation = useCreateSupportConversation();

  // Fetch conversations to compute global unread count
  const { data: conversations } = useGetConversations({
    query: {
      queryKey: getGetConversationsQueryKey(),
      enabled: !!user,
      refetchInterval: 10000, // Poll every 10s for badge updates
    }
  });
  const totalUnread = conversations?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) ?? 0;

  const handleSupport = () => {
    supportMutation.mutate(undefined, {
      onSuccess: (conv) => {
        setLocation(`/mensajes/${conv.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "No se pudo iniciar conversación con soporte.",
          variant: "destructive",
        });
      },
    });
  };

  const NavLinks = () => (
    <>
      <Link href="/servicios" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
        Explorar
      </Link>
      <Link href="/trabajos" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
        <Briefcase className="w-4 h-4" />
        Trabajos
      </Link>
      {user && (
        <>
          <Link href="/mensajes" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensajes
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-[10px] rounded-full">
                {totalUnread > 99 ? "99+" : totalUnread}
              </Badge>
            )}
          </Link>
          {!isCompany && (
            <Link href="/pedidos" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Pedidos
            </Link>
          )}
        </>
      )}
      {isProvider && (
        <>
          <Link href="/dashboard" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/mis-publicaciones" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
            <ListPlus className="w-4 h-4" />
            Mis Servicios
          </Link>
          <Button asChild size="sm" className="ml-2">
            <Link href="/publicar">
              <PlusCircle className="w-4 h-4 mr-2" />
              Publicar
            </Link>
          </Button>
        </>
      )}
      {isCompany && (
        <>
          <Link href="/mis-trabajos" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Mis Vacantes
          </Link>
          <Link href="/buscar-cvs" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Buscar CVs
          </Link>
          <Button asChild size="sm" className="ml-2">
            <Link href="/publicar-trabajo">
              <PlusCircle className="w-4 h-4 mr-2" />
              Publicar vacante
            </Link>
          </Button>
        </>
      )}
      {user && !isProvider && !isAdmin && !isCompany && (
        <Link href="/mis-postulaciones" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Mis Postulaciones
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Admin
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col gap-6 pt-6">
                  <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
                    <ShoppingBag className="w-6 h-6" />
                    ServiMarket
                  </Link>
                  <nav className="flex flex-col gap-4">
                    <NavLinks />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary hidden md:flex">
              <ShoppingBag className="w-6 h-6" />
              ServiMarket
            </Link>
            <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-primary md:hidden">
              <ShoppingBag className="w-5 h-5" />
              ServiMarket
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <NavLinks />
            </nav>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl.startsWith("/api") ? user.avatarUrl : `/api${user.avatarUrl}`} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium uppercase">{user.name.slice(0, 2)}</span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/perfil")} className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Mi perfil</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Panel Admin</span>
                    </DropdownMenuItem>
                  )}
                  {!isAdmin && (
                    <DropdownMenuItem onClick={handleSupport} className="cursor-pointer" disabled={supportMutation.isPending}>
                      <Headphones className="mr-2 h-4 w-4" />
                      <span>Contactar Soporte</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild>
                  <Link href="/registro">Registrarse</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
      <footer className="border-t py-4 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-3 md:h-16 md:flex-row mx-auto px-4">
          <p className="text-center text-xs md:text-sm leading-loose text-muted-foreground md:text-left">
            Construido para conectar la comunidad. ServiMarket &copy; {new Date().getFullYear()}.
          </p>
        </div>
      </footer>
    </div>
  );
}

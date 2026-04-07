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
  Shield,
  Headphones,
  ClipboardList,
  Briefcase,
  FileText,
  MailWarning,
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
import { useCreateSupportConversation, useGetConversations, getGetConversationsQueryKey, useResendVerification, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { imgUrl } from "@/lib/utils";

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

  const resendVerification = useResendVerification();
  const queryClient = useQueryClient();
  const showVerificationBanner = user && !user.emailVerified;

  const handleResendVerification = () => {
    resendVerification.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Email enviado",
          description: "Revisá tu bandeja de entrada para verificar tu email.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "No se pudo enviar el email de verificación.",
          variant: "destructive",
        });
      },
    });
  };

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
                  <Link href="/" className="flex items-center gap-2">
                    <img src="/logo2.png" alt="Mil Laburos" className="h-20 w-auto" />
                  </Link>
                  <nav className="flex flex-col gap-4">
                    <NavLinks />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="hidden md:flex items-center">
              <img src="/logo2.png" alt="Mil Laburos" className="h-20 w-auto" />
            </Link>
            <Link href="/" className="flex items-center md:hidden">
              <img src="/logo2.png" alt="Mil Laburos" className="h-20 w-auto" />
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
                        <img src={imgUrl(user.avatarUrl)} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
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
      {showVerificationBanner && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
          <div className="container mx-auto flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <MailWarning className="w-4 h-4 flex-shrink-0" />
              <span>Tu email no está verificado. Verificalo para recibir notificaciones.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
              onClick={handleResendVerification}
              disabled={resendVerification.isPending}
            >
              {resendVerification.isPending ? "Enviando..." : "Reenviar email"}
            </Button>
          </div>
        </div>
      )}
      <main className="flex-1 flex flex-col">{children}</main>
      <footer className="border-t py-6 md:py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center">
                <img src="/logo2.png" alt="Mil Laburos" className="h-10 w-auto" />
              </div>
              <p className="text-xs text-muted-foreground">
                Conectamos servicios y oportunidades.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <a href="mailto:soporte@millaburos.com" className="hover:text-primary transition-colors">
                  soporte@millaburos.com
                </a>
                <span className="text-border">|</span>
                <Link href="/terminos" className="hover:text-primary transition-colors">
                  Términos y Condiciones
                </Link>
              </div>
              <p>
                &copy; {new Date().getFullYear()} Mil Laburos. Desarrollado por <strong>RMSoluciones</strong>.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

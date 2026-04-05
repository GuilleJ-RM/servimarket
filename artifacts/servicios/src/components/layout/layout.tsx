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
  ShoppingBag
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

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isProvider } = useAuth();
  const [location, setLocation] = useLocation();

  const NavLinks = () => (
    <>
      <Link href="/servicios" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
        Explorar
      </Link>
      {user && (
        <Link href="/mensajes" className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Mensajes
        </Link>
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
    </>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
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
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <NavLinks />
            </nav>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-full object-cover" />
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
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Construido para conectar la comunidad. ServiMarket &copy; {new Date().getFullYear()}.
          </p>
        </div>
      </footer>
    </div>
  );
}

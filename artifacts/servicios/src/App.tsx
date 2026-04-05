import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Servicios from "@/pages/servicios";
import Servicio from "@/pages/servicio";
import Dashboard from "@/pages/dashboard";
import MisPublicaciones from "@/pages/mis-publicaciones";
import Publicar from "@/pages/publicar";
import Mensajes from "@/pages/mensajes";
import Chat from "@/pages/chat";
import Admin from "@/pages/admin";
import Pedidos from "@/pages/pedidos";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/registro" component={Register} />
      <Route path="/servicios" component={Servicios} />
      <Route path="/servicio/:id" component={Servicio} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/mis-publicaciones" component={MisPublicaciones} />
      <Route path="/publicar" component={Publicar} />
      <Route path="/mensajes" component={Mensajes} />
      <Route path="/mensajes/:id" component={Chat} />
      <Route path="/pedidos" component={Pedidos} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

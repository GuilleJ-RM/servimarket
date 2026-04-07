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
import Perfil from "@/pages/perfil";
import OlvidePassword from "@/pages/olvide-password";
import RestablecerPassword from "@/pages/restablecer-password";
import Trabajos from "@/pages/trabajos";
import Trabajo from "@/pages/trabajo";
import PublicarTrabajo from "@/pages/publicar-trabajo";
import MisTrabajos from "@/pages/mis-trabajos";
import MisPostulaciones from "@/pages/mis-postulaciones";
import BuscarCvs from "@/pages/buscar-cvs";
import VerificarEmail from "@/pages/verificar-email";
import Terminos from "@/pages/terminos";

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
      <Route path="/perfil" component={Perfil} />
      <Route path="/olvide-password" component={OlvidePassword} />
      <Route path="/restablecer-password" component={RestablecerPassword} />
      <Route path="/trabajos" component={Trabajos} />
      <Route path="/trabajo/:id" component={Trabajo} />
      <Route path="/publicar-trabajo" component={PublicarTrabajo} />
      <Route path="/mis-trabajos" component={MisTrabajos} />
      <Route path="/mis-postulaciones" component={MisPostulaciones} />
      <Route path="/buscar-cvs" component={BuscarCvs} />
      <Route path="/verificar-email" component={VerificarEmail} />
      <Route path="/terminos" component={Terminos} />
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

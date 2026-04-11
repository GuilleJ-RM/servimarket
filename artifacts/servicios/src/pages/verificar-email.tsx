import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/layout";
import { useVerifyEmail } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/use-seo";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function VerificarEmail() {
  useSEO({ title: "Verificar Email", noindex: true });
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const verifyMutation = useVerifyEmail();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      setStatus("error");
      return;
    }

    verifyMutation.mutate(
      { data: { email, token } },
      {
        onSuccess: () => setStatus("success"),
        onError: () => setStatus("error"),
      }
    );
  }, []);

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <h1 className="text-2xl font-bold">Verificando tu email...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h1 className="text-2xl font-bold">¡Email verificado!</h1>
              <p className="text-muted-foreground">Tu email fue verificado correctamente.</p>
              <Button asChild>
                <Link href="/">Ir al inicio</Link>
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h1 className="text-2xl font-bold">Error de verificación</h1>
              <p className="text-muted-foreground">El enlace es inválido o ya fue utilizado.</p>
              <Button asChild variant="outline">
                <Link href="/">Ir al inicio</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

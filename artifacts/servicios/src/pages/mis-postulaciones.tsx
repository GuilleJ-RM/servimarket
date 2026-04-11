import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetMyApplications, getGetMyApplicationsQueryKey } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/use-seo";
import type { JobApplicationWithJob } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Briefcase, MapPin, Building2 } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";

const contractLabel: Record<string, string> = { full_time: "Tiempo completo", part_time: "Medio tiempo", freelance: "Freelance", pasantia: "Pasantía" };
const modalityLabel: Record<string, string> = { presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido" };
const statusLabel: Record<string, string> = { pending: "Pendiente", visto: "Visto", rechazado: "Rechazado", finalista: "Finalista" };
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  visto: "secondary",
  finalista: "default",
  rechazado: "destructive",
};

export default function MisPostulaciones() {
  useSEO({ title: "Mis Postulaciones", noindex: true });
  const { user } = useAuth();
  const { data: applications, isLoading, isError } = useGetMyApplications({ query: { queryKey: getGetMyApplicationsQueryKey(), enabled: !!user } });

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Iniciá sesión para ver tus postulaciones</p>
          <Button asChild className="mt-4"><Link href="/login">Iniciar sesión</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 mb-6">
          <ClipboardList className="w-7 h-7 text-primary" />
          Mis postulaciones
        </h1>

        {isError ? (
          <ErrorState message="No se pudieron cargar tus postulaciones" />
        ) : isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : !applications?.length ? (
          <Card className="text-center py-12">
            <CardContent>
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">No tenés postulaciones</p>
              <p className="text-muted-foreground mb-4">Explora las vacantes disponibles y postulate</p>
              <Button asChild><Link href="/trabajos">Ver trabajos</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app: JobApplicationWithJob) => (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/trabajo/${app.jobId}`}>
                        <h3 className="font-semibold text-base hover:text-primary transition-colors cursor-pointer">
                          {app.job.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{app.company?.companyName || app.company?.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="text-xs">{contractLabel[app.job.contractType] || app.job.contractType}</Badge>
                        <Badge variant="outline" className="text-xs">{modalityLabel[app.job.modality] || app.job.modality}</Badge>
                        {app.job.locality && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {app.job.locality}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusVariant[app.status]}>{statusLabel[app.status]}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(app.createdAt).toLocaleDateString("es")}</span>
                    </div>
                  </div>
                  {app.coverLetter && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2 border-t pt-2">{app.coverLetter}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetMyJobs, useGetJobApplications, useUpdateApplicationStatus, useDeleteJob, getGetMyJobsQueryKey, getGetJobApplicationsQueryKey, useGetJob, getGetJobQueryKey } from "@workspace/api-client-react";
import type { JobPostingWithCompany, JobApplicationWithDetails } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { Briefcase, Plus, Users, FileText, Eye, Trash2, ChevronDown, ChevronUp, MapPin, Clock, Phone, Mail, Download, Filter, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CvViewerDialog } from "@/components/cv-viewer-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { imgUrl } from "@/lib/utils";

const contractLabel: Record<string, string> = { full_time: "Tiempo completo", part_time: "Medio tiempo", freelance: "Freelance", pasantia: "Pasantía" };
const modalityLabel: Record<string, string> = { presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido" };
const statusLabel: Record<string, string> = { pending: "Pendiente", visto: "Visto", rechazado: "Rechazado", finalista: "Finalista" };
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  visto: "secondary",
  finalista: "default",
  rechazado: "destructive",
};

export default function MisTrabajos() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applicantDialog, setApplicantDialog] = useState<JobApplicationWithDetails | null>(null);
  const [viewingCv, setViewingCv] = useState<{ url: string; name: string } | null>(null);
  const [filterQuestionId, setFilterQuestionId] = useState<string>("");
  const [filterAnswer, setFilterAnswer] = useState<string>("");

  const { data: jobs, isLoading } = useGetMyJobs({ query: { queryKey: getGetMyJobsQueryKey(), enabled: user?.role === "company" } });
  const { data: applications, isLoading: appsLoading } = useGetJobApplications(
    selectedJobId!,
    { query: { queryKey: getGetJobApplicationsQueryKey(selectedJobId!), enabled: !!selectedJobId } }
  );
  const { data: jobDetail } = useGetJob(selectedJobId!, { query: { queryKey: getGetJobQueryKey(selectedJobId!), enabled: !!selectedJobId } });
  const updateStatus = useUpdateApplicationStatus();
  const deleteJob = useDeleteJob();

  // Questions from the selected job for filtering
  const jobQuestions = jobDetail?.questions ?? [];

  // Filter applications by question answer
  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    if (!filterQuestionId || !filterAnswer) return applications;
    const qId = Number(filterQuestionId);
    return applications.filter((app: JobApplicationWithDetails) => {
      const answer = app.answers?.find((a) => a.questionId === qId);
      if (!answer) return false;
      return answer.answerText?.toLowerCase().includes(filterAnswer.toLowerCase());
    });
  }, [applications, filterQuestionId, filterAnswer]);

  if (!user || user.role !== "company") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Solo las empresas pueden ver esta página</p>
        </div>
      </Layout>
    );
  }

  const handleDeleteJob = (id: number, title: string) => {
    if (!confirm(`¿Eliminar la vacante "${title}"?`)) return;
    deleteJob.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Vacante eliminada" });
        queryClient.invalidateQueries({ queryKey: ["/api/jobs/my"] });
        if (selectedJobId === id) setSelectedJobId(null);
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const handleStatusChange = (applicationId: number, status: string) => {
    updateStatus.mutate(
      { id: applicationId, data: { status: status as any } },
      {
        onSuccess: () => {
          toast({ title: `Estado cambiado a ${statusLabel[status]}` });
          queryClient.invalidateQueries({ queryKey: [`/api/jobs/${selectedJobId}/applications`] });
        },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" />
            Mis vacantes
          </h1>
          <Button asChild>
            <Link href="/publicar-trabajo"><Plus className="w-4 h-4 mr-2" /> Nueva vacante</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : !jobs?.length ? (
          <Card className="text-center py-12">
            <CardContent>
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">No tenés vacantes publicadas</p>
              <p className="text-muted-foreground mb-4">Creá tu primera vacante para empezar a recibir postulaciones</p>
              <Button asChild><Link href="/publicar-trabajo">Publicar vacante</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Jobs list */}
            <div className="lg:col-span-1 space-y-3">
              {jobs.map((job: JobPostingWithCompany) => (
                <Card
                  key={job.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedJobId === job.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => { setSelectedJobId(job.id); setFilterQuestionId(""); setFilterAnswer(""); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-[10px]">{contractLabel[job.contractType] || job.contractType}</Badge>
                          <Badge variant="outline" className="text-[10px]">{modalityLabel[job.modality] || job.modality}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(job.createdAt).toLocaleDateString("es")}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={job.isActive ? "default" : "secondary"} className="text-[10px]">
                          {job.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                        {!(job as any).adminApproved && (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">
                            Pendiente
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id, job.title); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Applications panel */}
            <div className="lg:col-span-2">
              {!selectedJobId ? (
                <Card className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">Seleccioná una vacante para ver las postulaciones</p>
                </Card>
              ) : appsLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : !applications?.length ? (
                <Card className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No hay postulaciones para esta vacante</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{filteredApplications.length} postulacion{filteredApplications.length !== 1 ? "es" : ""}</h2>
                    {jobQuestions.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={filterQuestionId} onValueChange={(v) => { setFilterQuestionId(v); setFilterAnswer(""); }}>
                          <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs">
                            <Filter className="w-3 h-3 mr-1" />
                            <SelectValue placeholder="Filtrar por pregunta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin filtro</SelectItem>
                            {jobQuestions.map((q) => (
                              <SelectItem key={q.id} value={String(q.id)}>{q.questionText}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {filterQuestionId && filterQuestionId !== "none" && (() => {
                          const q = jobQuestions.find(q => q.id === Number(filterQuestionId));
                          if (q && q.questionType !== "text" && q.options) {
                            return (
                              <Select value={filterAnswer} onValueChange={setFilterAnswer}>
                                <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                                  <SelectValue placeholder="Seleccionar respuesta" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(q.options as string[]).map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          }
                          return (
                            <input
                              type="text"
                              placeholder="Buscar en respuestas..."
                              value={filterAnswer}
                              onChange={(e) => setFilterAnswer(e.target.value)}
                              className="h-8 text-xs border rounded-md px-2 w-full sm:w-[180px]"
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {filteredApplications.map((app: JobApplicationWithDetails) => (
                    <Card key={app.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                              {app.applicant.avatarUrl ? (
                                <img src={imgUrl(app.applicant.avatarUrl)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">
                                  {app.applicant.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{app.applicant.name}</p>
                              <p className="text-xs text-muted-foreground">{app.applicant.email}</p>
                              {app.applicant.locality && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {app.applicant.locality}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={statusVariant[app.status]}>{statusLabel[app.status]}</Badge>
                            <span className="text-[10px] text-muted-foreground">{new Date(app.createdAt).toLocaleDateString("es")}</span>
                          </div>
                        </div>

                        {app.coverLetter && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{app.coverLetter}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setApplicantDialog(app)}>
                            {app.answers?.length > 0 ? (
                              <><MessageSquare className="w-3 h-3 mr-1" /> Ver respuestas</>
                            ) : (
                              <><Eye className="w-3 h-3 mr-1" /> Ver detalle</>
                            )}
                          </Button>
                          {app.applicant.cvUrl && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setViewingCv({ url: app.applicant.cvUrl!, name: app.applicant.name })}>
                              <Eye className="w-3 h-3 mr-1" /> Ver CV
                            </Button>
                          )}
                          {app.status === "pending" && (
                            <>
                              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleStatusChange(app.id, "visto")}>Visto</Button>
                              <Button size="sm" variant="default" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(app.id, "finalista")}>Finalista</Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleStatusChange(app.id, "rechazado")}>Rechazar</Button>
                            </>
                          )}
                          {app.status === "visto" && (
                            <>
                              <Button size="sm" variant="default" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(app.id, "finalista")}>Finalista</Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleStatusChange(app.id, "rechazado")}>Rechazar</Button>
                            </>
                          )}
                          {app.status === "finalista" && (
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleStatusChange(app.id, "rechazado")}>Rechazar</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Applicant detail dialog */}
      <Dialog open={!!applicantDialog} onOpenChange={() => setApplicantDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {applicantDialog && (
            <>
              <DialogHeader>
                <DialogTitle>{applicantDialog.applicant.name}</DialogTitle>
                <DialogDescription>{applicantDialog.applicant.email}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-3 text-sm">
                  {applicantDialog.applicant.phone && (
                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {applicantDialog.applicant.phone}</span>
                  )}
                  {applicantDialog.applicant.locality && (
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {applicantDialog.applicant.locality}</span>
                  )}
                </div>
                {applicantDialog.applicant.cvUrl && (
                  <Button size="sm" variant="outline" onClick={() => { setApplicantDialog(null); setViewingCv({ url: applicantDialog.applicant.cvUrl!, name: applicantDialog.applicant.name }); }}>
                    <Eye className="w-4 h-4 mr-2" /> Ver CV
                  </Button>
                )}
                {applicantDialog.coverLetter && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Carta de presentación</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{applicantDialog.coverLetter}</p>
                  </div>
                )}
                {applicantDialog.answers?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Respuestas</h4>
                    <div className="space-y-3">
                      {applicantDialog.answers.map((a) => (
                        <div key={a.id} className="border rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground">{a.question?.questionText || `Pregunta #${a.questionId}`}</p>
                          <p className="text-sm mt-1">{a.answerText || <span className="text-muted-foreground italic">Sin respuesta</span>}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CvViewerDialog
        open={!!viewingCv}
        onOpenChange={() => setViewingCv(null)}
        cvUrl={viewingCv?.url ?? ""}
        userName={viewingCv?.name}
      />
    </Layout>
  );
}

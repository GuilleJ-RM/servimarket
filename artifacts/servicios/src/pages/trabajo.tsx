import { Layout } from "@/components/layout/layout";
import { useGetJob, useApplyToJob, getGetJobQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import { MapPin, Building2, Clock, DollarSign, FileText, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQueryClient } from "@tanstack/react-query";

const MODALITY_LABELS: Record<string, string> = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
};

const CONTRACT_LABELS: Record<string, string> = {
  full_time: "Tiempo completo",
  part_time: "Medio tiempo",
  freelance: "Freelance",
  pasantia: "Pasantía",
};

export default function Trabajo() {
  const params = useParams<{ id: string }>();
  const { data: job, isLoading } = useGetJob(Number(params.id));
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const applyMutation = useApplyToJob();

  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (!job) return;
    const answersArray = Object.entries(answers).map(([questionId, answerText]) => ({
      questionId: Number(questionId),
      answerText,
    }));

    applyMutation.mutate(
      { id: job.id, data: { coverLetter: coverLetter || null, answers: answersArray } },
      {
        onSuccess: () => {
          toast({ title: "¡Postulación enviada!", description: "La empresa revisará tu perfil" });
          setApplied(true);
          queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(job.id) });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.error || "No se pudo enviar la postulación", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Vacante no encontrada</p>
          <Button asChild className="mt-4"><Link href="/trabajos">Ver todas las vacantes</Link></Button>
        </div>
      </Layout>
    );
  }

  const isOwnJob = user?.role === "company" && user.id === job.companyId;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{job.title}</h1>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {job.company?.avatarUrl ? (
                    <img src={job.company.avatarUrl.startsWith("/api") ? job.company.avatarUrl : `/api${job.company.avatarUrl}`} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-primary">{job.company?.companyName || job.company?.name}</p>
                  {job.company?.locality && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.company.locality}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {CONTRACT_LABELS[job.contractType] || job.contractType}
                </Badge>
                <Badge variant="outline">{MODALITY_LABELS[job.modality] || job.modality}</Badge>
                {job.locality && (
                  <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{job.locality}</Badge>
                )}
                {(job.salaryMin || job.salaryMax) && (
                  <Badge variant="outline">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {job.salaryMin && job.salaryMax
                      ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                      : job.salaryMin ? `Desde $${job.salaryMin.toLocaleString()}`
                      : `Hasta $${job.salaryMax!.toLocaleString()}`}
                  </Badge>
                )}
              </div>
            </div>

            <Card>
              <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.description}</p>
              </CardContent>
            </Card>

            {job.requirements && (
              <Card>
                <CardHeader><CardTitle>Requisitos</CardTitle></CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.requirements}</p>
                </CardContent>
              </Card>
            )}

            {job.benefits && (
              <Card>
                <CardHeader><CardTitle>Beneficios</CardTitle></CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{job.benefits}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Apply */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Postularse
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Inicia sesión para postularte</p>
                    <Button asChild className="w-full"><Link href="/login">Iniciar sesión</Link></Button>
                  </div>
                ) : isOwnJob ? (
                  <p className="text-sm text-muted-foreground text-center">Esta es tu vacante</p>
                ) : applied ? (
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <p className="font-semibold text-green-600">¡Postulación enviada!</p>
                    <p className="text-xs text-muted-foreground">La empresa revisará tu perfil</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.cvUrl ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-2">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span>Tu CV será adjuntado automáticamente</span>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                        Subí tu CV desde <Link href="/perfil" className="underline font-medium">tu perfil</Link> para adjuntarlo
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium">Carta de presentación (opcional)</Label>
                      <Textarea
                        placeholder="Contá por qué te interesa este puesto..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="mt-1"
                        rows={4}
                      />
                    </div>

                    {/* Questions */}
                    {job.questions && job.questions.length > 0 && (
                      <div className="space-y-4 border-t pt-4">
                        <p className="text-sm font-semibold">Preguntas de la empresa</p>
                        {job.questions.map((q) => (
                          <div key={q.id} className="space-y-1.5">
                            <Label className="text-sm">
                              {q.questionText}
                              {q.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            {q.questionType === "text" ? (
                              <Textarea
                                placeholder="Tu respuesta..."
                                value={answers[q.id] || ""}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                rows={2}
                              />
                            ) : q.questionType === "single_choice" && q.options ? (
                              <RadioGroup
                                value={answers[q.id] || ""}
                                onValueChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                              >
                                {(q.options as string[]).map((opt) => (
                                  <div key={opt} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt} id={`q${q.id}-${opt}`} />
                                    <Label htmlFor={`q${q.id}-${opt}`} className="text-sm">{opt}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            ) : (
                              <Input
                                placeholder="Tu respuesta..."
                                value={answers[q.id] || ""}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleApply}
                      disabled={applyMutation.isPending}
                    >
                      {applyMutation.isPending ? "Enviando..." : "Enviar postulación"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Publicado el {new Date(job.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

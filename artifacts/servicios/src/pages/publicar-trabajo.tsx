import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useCreateJob } from "@workspace/api-client-react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Trash2, Briefcase, HelpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const ARGENTINA_PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
] as const;

const jobSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().min(20, "Mínimo 20 caracteres"),
  industry: z.string().optional(),
  locality: z.string().optional(),
  modality: z.enum(["presencial", "remoto", "hibrido"]),
  contractType: z.enum(["full_time", "part_time", "freelance", "pasantia"]),
  salaryMin: z.coerce.number().optional().nullable(),
  salaryMax: z.coerce.number().optional().nullable(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  questions: z.array(z.object({
    questionText: z.string().min(1, "La pregunta es obligatoria"),
    questionType: z.enum(["text", "single_choice", "multiple_choice"]),
    options: z.string().optional(),
    required: z.boolean(),
  })),
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function PublicarTrabajo() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createJob = useCreateJob();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      description: "",
      industry: "",
      locality: "",
      modality: "presencial",
      contractType: "full_time",
      salaryMin: null,
      salaryMax: null,
      requirements: "",
      benefits: "",
      questions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });

  if (!user || user.role !== "company") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Solo las empresas pueden publicar vacantes</p>
        </div>
      </Layout>
    );
  }

  if (!user.companyApproved) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Tu cuenta de empresa aún no fue aprobada por el administrador</p>
        </div>
      </Layout>
    );
  }

  const onSubmit = (data: JobFormValues) => {
    const questions = data.questions.map(q => ({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.questionType !== "text" && q.options ? q.options.split(",").map(o => o.trim()).filter(Boolean) : null,
      required: q.required,
    }));

    createJob.mutate(
      {
        data: {
          title: data.title,
          description: data.description,
          industry: data.industry || null,
          locality: data.locality || null,
          modality: data.modality,
          contractType: data.contractType,
          salaryMin: data.salaryMin || null,
          salaryMax: data.salaryMax || null,
          requirements: data.requirements || null,
          benefits: data.benefits || null,
          questions,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Vacante publicada" });
          setLocation("/mis-trabajos");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.error || "No se pudo publicar", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-8">
          <Briefcase className="w-8 h-8 text-primary" />
          Publicar vacante
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del puesto</CardTitle>
                <CardDescription>Datos principales de la vacante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del puesto *</FormLabel>
                    <FormControl><Input placeholder="Ej: Desarrollador Full Stack" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción *</FormLabel>
                    <FormControl><Textarea placeholder="Describí las tareas y responsabilidades..." rows={5} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="modality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidad</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="remoto">Remoto</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="contractType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de contrato</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="full_time">Tiempo completo</SelectItem>
                          <SelectItem value="part_time">Medio tiempo</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="pasantia">Pasantía</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="locality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ARGENTINA_PROVINCES.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rubro / Industria</FormLabel>
                      <FormControl><Input placeholder="Ej: Tecnología" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="salaryMin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salario mínimo (opcional)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="salaryMax" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salario máximo (opcional)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalles adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="requirements" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requisitos</FormLabel>
                    <FormControl><Textarea placeholder="Experiencia, estudios, habilidades..." rows={3} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="benefits" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficios</FormLabel>
                    <FormControl><Textarea placeholder="Obra social, capacitación, horarios flexibles..." rows={3} {...field} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5" /> Preguntas de filtro</CardTitle>
                <CardDescription>Agregá preguntas para filtrar postulantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Pregunta {index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <FormField control={form.control} name={`questions.${index}.questionText`} render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Ej: ¿Tenés experiencia con React?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name={`questions.${index}.questionType`} render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="text">Texto libre</SelectItem>
                              <SelectItem value="single_choice">Opción única</SelectItem>
                              <SelectItem value="multiple_choice">Opción múltiple</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`questions.${index}.required`} render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 text-sm">Obligatoria</FormLabel>
                        </FormItem>
                      )} />
                    </div>
                    {form.watch(`questions.${index}.questionType`) !== "text" && (
                      <FormField control={form.control} name={`questions.${index}.options`} render={({ field }) => (
                        <FormItem>
                          <FormControl><Input placeholder="Opciones separadas por coma: Sí, No, Tal vez" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={() => append({ questionText: "", questionType: "text", options: "", required: true })}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar pregunta
                </Button>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={createJob.isPending}>
              {createJob.isPending ? "Publicando..." : "Publicar vacante"}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}

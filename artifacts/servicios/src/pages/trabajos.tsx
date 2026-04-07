import { Layout } from "@/components/layout/layout";
import { useGetJobs } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Search, MapPin, Briefcase, Building2, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import { imgUrl } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function Trabajos() {
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localityQuery, setLocalityQuery] = useState("");

  const { data: jobs, isLoading } = useGetJobs({ search: searchQuery || undefined, locality: localityQuery || undefined });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setLocalityQuery(locality);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-primary" />
              Bolsa de trabajo
            </h1>
            <p className="text-muted-foreground mt-1">Encontrá tu próximo empleo</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative flex-1 max-w-xs">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Localidad..."
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : !jobs?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No se encontraron vacantes</p>
            <p className="text-sm">Intentá con otros términos de búsqueda</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Link key={job.id} href={`/trabajo/${job.id}`}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        {job.company?.avatarUrl ? (
                          <img src={imgUrl(job.company.avatarUrl)} alt="" className="w-full h-full rounded-lg object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-tight mb-1">{job.title}</h3>
                        <p className="text-sm text-primary font-medium mb-2">
                          {job.company?.companyName || job.company?.name}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {CONTRACT_LABELS[job.contractType] || job.contractType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {MODALITY_LABELS[job.modality] || job.modality}
                          </Badge>
                          {job.locality && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              {job.locality}
                            </Badge>
                          )}
                          {(job.salaryMin || job.salaryMax) && (
                            <Badge variant="outline" className="text-xs">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {job.salaryMin && job.salaryMax
                                ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                                : job.salaryMin ? `Desde $${job.salaryMin.toLocaleString()}`
                                : `Hasta $${job.salaryMax!.toLocaleString()}`}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="md:text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

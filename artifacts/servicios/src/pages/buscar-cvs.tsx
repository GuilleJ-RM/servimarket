import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { useGetPublicCvs, useGetCategories } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, FileText, User, Mail, Phone, Eye } from "lucide-react";
import { useState } from "react";
import { CvViewerDialog } from "@/components/cv-viewer-dialog";

const ARGENTINA_PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
] as const;

export default function BuscarCvs() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localityQuery, setLocalityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState<number | undefined>();
  const [viewingCv, setViewingCv] = useState<{ url: string; name: string } | null>(null);

  const { data: cvs, isLoading } = useGetPublicCvs({
    search: searchQuery || undefined,
    locality: localityQuery || undefined,
    categoryId: categoryQuery ?? undefined,
  });

  const { data: categories } = useGetCategories();

  if (!user || user.role !== "company") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">Solo las empresas pueden buscar CVs</p>
        </div>
      </Layout>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setLocalityQuery(locality);
    setCategoryQuery(categoryId ? Number(categoryId) : undefined);
  };

  const getCategoryName = (id: number) => {
    return categories?.find((c) => c.id === id)?.name ?? `#${id}`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Buscar CVs
          </h1>
          <p className="text-muted-foreground mt-1">Encontrá candidatos para tus vacantes</p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={locality} onValueChange={setLocality}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Provincia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {ARGENTINA_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">
            <Search className="w-4 h-4 mr-2" />Buscar
          </Button>
        </form>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : !cvs?.length ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No se encontraron CVs</h2>
            <p className="text-muted-foreground">Probá ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cvs.map((cv) => (
              <Card key={cv.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={cv.avatarUrl ?? undefined} />
                      <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{cv.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{cv.email}</span>
                      </div>
                      {cv.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{cv.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {cv.locality && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{cv.locality}</span>
                    </div>
                  )}

                  {cv.cvCategories && cv.cvCategories !== "all" && Array.isArray(cv.cvCategories) && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {cv.cvCategories.map((catId) => (
                        <Badge key={catId} variant="secondary" className="text-xs">
                          {getCategoryName(catId)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {cv.cvCategories === "all" && (
                    <Badge variant="outline" className="mb-3 text-xs">Todas las categorías</Badge>
                  )}

                  {cv.cvUrl && (
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setViewingCv({ url: cv.cvUrl!, name: cv.name })}>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver CV
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CvViewerDialog
        open={!!viewingCv}
        onOpenChange={() => setViewingCv(null)}
        cvUrl={viewingCv?.url ?? ""}
        userName={viewingCv?.name}
      />
    </Layout>
  );
}

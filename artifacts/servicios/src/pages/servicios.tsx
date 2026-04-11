import { useState } from "react";
import { useGetCategories, useGetListings } from "@workspace/api-client-react";
import type { GetListingsType } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/layout";
import { useAuth } from "@/lib/auth";
import { imgUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, SlidersHorizontal, MapPin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useSearch } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ErrorState } from "@/components/ui/error-state";
import { ARGENTINA_PROVINCES } from "@/lib/constants";
import { useSEO } from "@/hooks/use-seo";

export default function Servicios() {
  const { user } = useAuth();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const initialSearch = searchParams.get("search") || "";
  const initialCategoryId = searchParams.get("categoryId") ? parseInt(searchParams.get("categoryId") as string) : null;
  const initialType = searchParams.get("type") as GetListingsType | null;

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId);
  const [type, setType] = useState<GetListingsType | null>(initialType);
  const [locality, setLocality] = useState<string | null>(user?.locality || null);

  const { data: categories } = useGetCategories();

  // Filter categories based on selected type
  const filteredCategories = categories?.filter(c => !type || c.type === type);
  
  const { data: listings, isLoading, isError } = useGetListings({
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
    type: type || undefined,
    locality: locality || undefined,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(searchTerm);
  };

  const activeFiltersCount = [categoryId, type, locality].filter(Boolean).length;

  const selectedCategory = categories?.find(c => c.id === categoryId);
  useSEO({
    title: debouncedSearch
      ? `${debouncedSearch}${locality ? ` en ${locality}` : ""} - Servicios y Productos`
      : selectedCategory
        ? `${selectedCategory.name} - Servicios y Productos`
        : "Servicios y Productos",
    description: `Encontra ${debouncedSearch || "servicios y productos"}${locality ? " en " + locality : ""} en Mil Laburos. Profesionales verificados, precios transparentes.`,
    keywords: `${debouncedSearch || "servicios, productos"}, ${selectedCategory?.name || ""}, ${locality || "Argentina"}, comprar, contratar, presupuesto, Mil Laburos`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `Servicios y Productos${debouncedSearch ? " - " + debouncedSearch : ""}`,
      "url": `https://millaburos.com/servicios${searchString ? "?" + searchString : ""}`,
      "description": `Listado de servicios y productos${debouncedSearch ? " relacionados con " + debouncedSearch : ""} en Mil Laburos.`,
    },
  });

  return (
    <Layout>
      {/* Search header - compact */}
      <div className="bg-gradient-to-b from-primary/5 to-background py-4 md:py-6 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold">Explorar</h1>
              {listings && listings.length > 0 && (
                <span className="text-xs md:text-sm text-muted-foreground">{listings.length} resultado{listings.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                className="pl-9 pr-20 h-10 text-sm rounded-full border-2 focus-visible:ring-primary/20" 
                placeholder="Buscar servicios y productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" size="sm" className="absolute right-1 top-1 bottom-1 rounded-full px-4 text-xs">
                Buscar
              </Button>
            </form>

            {/* Inline filter chips - desktop */}
            <div className="hidden md:flex gap-2 flex-wrap">
              <Select 
                value={type || "all"} 
                onValueChange={(val) => { setType(val === "all" ? null : val as GetListingsType); setCategoryId(null); }}
              >
                <SelectTrigger className="w-auto h-8 rounded-full border text-xs gap-1 px-3 bg-background">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="service">🔧 Servicios</SelectItem>
                  <SelectItem value="product">📦 Productos</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={categoryId?.toString() || "all"} 
                onValueChange={(val) => setCategoryId(val === "all" ? null : parseInt(val))}
              >
                <SelectTrigger className="w-auto h-8 rounded-full border text-xs gap-1 px-3 bg-background max-w-[200px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {filteredCategories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.icon} {cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={locality || "all"} 
                onValueChange={(val) => setLocality(val === "all" ? null : val)}
              >
                <SelectTrigger className="w-auto h-8 rounded-full border text-xs gap-1 px-3 bg-background max-w-[180px]">
                  <MapPin className="w-3 h-3" />
                  <SelectValue placeholder="Provincia" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  <SelectItem value="all">Todas las provincias</SelectItem>
                  {ARGENTINA_PROVINCES.map((prov) => (
                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setCategoryId(null); setType(null); setLocality(null); setSearchTerm(""); setDebouncedSearch(""); }}
                >
                  Limpiar filtros ({activeFiltersCount})
                </Button>
              )}
            </div>

            {/* Mobile filter button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden h-9 rounded-full w-full flex items-center gap-2 text-sm">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeFiltersCount}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Refina tu búsqueda</SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select 
                      value={type || "all"} 
                      onValueChange={(val) => { setType(val === "all" ? null : val as GetListingsType); setCategoryId(null); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="service">Servicios</SelectItem>
                        <SelectItem value="product">Productos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoría</label>
                    <Select 
                      value={categoryId?.toString() || "all"} 
                      onValueChange={(val) => setCategoryId(val === "all" ? null : parseInt(val))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {filteredCategories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.icon} {cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provincia</label>
                    <Select 
                      value={locality || "all"} 
                      onValueChange={(val) => setLocality(val === "all" ? null : val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Provincia" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        <SelectItem value="all">Todas las provincias</SelectItem>
                        {ARGENTINA_PROVINCES.map((prov) => (
                          <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setCategoryId(null); setType(null); setLocality(null); }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        {isError ? (
          <ErrorState message="No se pudieron cargar los servicios" />
        ) : isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] md:h-[320px] rounded-xl" />
            ))}
          </div>
        ) : listings?.length === 0 ? (
          <div className="text-center py-16 md:py-24">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h2 className="text-lg md:text-xl font-bold mb-1">Sin resultados</h2>
            <p className="text-muted-foreground text-sm mb-4">Probá ajustando los filtros o el término de búsqueda.</p>
            <Button size="sm" variant="outline" onClick={() => {
              setSearchTerm("");
              setDebouncedSearch("");
              setCategoryId(null);
              setType(null);
              setLocality(null);
            }}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {listings?.map((listing) => {
              const imgSrc = (listing as any).images?.length > 0 ? (listing as any).images[0] : listing.imageUrl;
              const hasVariants = (listing as any).sizes?.length > 0;
              const minPrice = hasVariants ? Math.min(...(listing as any).sizes.map((s: any) => s.price || listing.price)) : listing.price;

              return (
                <Link key={listing.id} href={`/servicio/${listing.id}`}>
                  <Card className="h-full overflow-hidden cursor-pointer group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col border hover:border-primary/20">
                    {/* Image */}
                    <div className="aspect-[3/2] w-full overflow-hidden relative bg-muted">
                      {imgSrc ? (
                        <img 
                          src={imgUrl(imgSrc)} 
                          alt={listing.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
                          {listing.category.icon}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        <Badge className="bg-background/90 text-foreground backdrop-blur-sm shadow-sm text-[10px] md:text-xs px-1.5 py-0.5">
                          {listing.type === "service" ? "🔧 Servicio" : "📦 Producto"}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-2.5 md:p-4 flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs md:text-sm">{listing.category.icon}</span>
                        <span className="text-[9px] md:text-[11px] text-muted-foreground font-medium uppercase tracking-wider truncate">{listing.category.name}</span>
                      </div>

                      <h3 className="font-semibold text-xs md:text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>

                      <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm md:text-base text-primary leading-none">
                            {hasVariants ? <>Desde ${minPrice.toLocaleString()}</> : <>${listing.price.toLocaleString()}</>}
                          </div>
                        </div>
                      </div>

                      {/* Provider - hidden on very small screens */}
                      <div className="hidden sm:flex items-center gap-1.5 pt-2 border-t mt-1">
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-muted overflow-hidden flex-shrink-0 border">
                          {listing.provider.avatarUrl ? (
                            <img src={imgUrl(listing.provider.avatarUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-secondary text-secondary-foreground flex items-center justify-center text-[8px] md:text-[10px] font-bold">
                              {listing.provider.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] md:text-xs text-muted-foreground truncate">{listing.provider.name}</span>
                        {listing.provider.locality && (
                          <span className="text-[9px] md:text-[10px] text-muted-foreground truncate ml-auto hidden md:block">
                            📍 {listing.provider.locality}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

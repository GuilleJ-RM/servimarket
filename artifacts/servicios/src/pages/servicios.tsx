import { useState } from "react";
import { useGetCategories, useGetListings } from "@workspace/api-client-react";
import type { GetListingsType } from "@workspace/api-client-react/src/generated/api.schemas";
import { Layout } from "@/components/layout/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

export default function Servicios() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const initialSearch = searchParams.get("search") || "";
  const initialCategoryId = searchParams.get("categoryId") ? parseInt(searchParams.get("categoryId") as string) : null;
  const initialType = searchParams.get("type") as GetListingsType | null;

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId);
  const [type, setType] = useState<GetListingsType | null>(initialType);

  const { data: categories } = useGetCategories();
  
  const { data: listings, isLoading } = useGetListings({
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
    type: type || undefined,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(searchTerm);
  };

  return (
    <Layout>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Explorar Servicios y Productos</h1>
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                className="pl-10 h-12 text-base rounded-xl border-2" 
                placeholder="Buscar por nombre, descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" className="absolute right-1 top-1 bottom-1 rounded-lg">
                Buscar
              </Button>
            </form>

            <div className="hidden md:flex gap-4">
              <Select 
                value={categoryId?.toString() || "all"} 
                onValueChange={(val) => setCategoryId(val === "all" ? null : parseInt(val))}
              >
                <SelectTrigger className="w-[200px] h-12 rounded-xl border-2">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={type || "all"} 
                onValueChange={(val) => setType(val === "all" ? null : val as GetListingsType)}
              >
                <SelectTrigger className="w-[200px] h-12 rounded-xl border-2">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="service">Servicios</SelectItem>
                  <SelectItem value="product">Productos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden h-12 rounded-xl border-2 w-full flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Refina tu búsqueda</SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Categoría</label>
                    <Select 
                      value={categoryId?.toString() || "all"} 
                      onValueChange={(val) => setCategoryId(val === "all" ? null : parseInt(val))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Tipo</label>
                    <Select 
                      value={type || "all"} 
                      onValueChange={(val) => setType(val === "all" ? null : val as GetListingsType)}
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[400px] rounded-2xl" />
            ))}
          </div>
        ) : listings?.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No se encontraron resultados</h2>
            <p className="text-muted-foreground mb-6">Intenta ajustar los filtros o tu término de búsqueda.</p>
            <Button onClick={() => {
              setSearchTerm("");
              setDebouncedSearch("");
              setCategoryId(null);
              setType(null);
            }}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings?.map((listing) => (
              <Link key={listing.id} href={`/servicio/${listing.id}`}>
                <Card className="h-full overflow-hidden cursor-pointer group hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col border-2 hover:border-primary/30">
                  <div className="aspect-[4/3] w-full overflow-hidden relative bg-muted">
                    {listing.imageUrl ? (
                      <img 
                        src={listing.imageUrl} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/30">
                        {listing.category.icon}
                      </div>
                    )}
                    <Badge className="absolute top-3 right-3 bg-background/90 text-foreground backdrop-blur-sm shadow-sm">
                      {listing.type === "service" ? "Servicio" : "Producto"}
                    </Badge>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{listing.category.icon}</span>
                      <span className="text-xs text-primary font-medium uppercase tracking-wider">{listing.category.name}</span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {listing.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 border">
                        {listing.provider.avatarUrl ? (
                          <img src={listing.provider.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                            {listing.provider.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">{listing.provider.name}</span>
                        <span className="text-xs text-muted-foreground">Profesional</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 flex justify-between items-center bg-muted/10">
                    <div className="font-bold text-xl text-primary">${listing.price.toLocaleString()}</div>
                    <Button variant="outline" size="sm" className="rounded-full font-semibold">Ver detalles</Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

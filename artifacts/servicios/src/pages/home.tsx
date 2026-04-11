import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, TrendingUp, ShieldCheck, Briefcase } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useGetCategories, useGetFeaturedListings } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { imgUrl } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";

export default function Home() {
  const { data: categories, isLoading: loadingCategories, isError: errorCategories } = useGetCategories();
  const { data: featuredListings, isLoading: loadingFeatured, isError: errorFeatured } = useGetFeaturedListings();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setLocation(`/servicios?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary/5 py-12 md:py-20 lg:py-28">
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <Badge className="mb-4 md:mb-6 px-3 py-0.5 text-xs md:text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors" variant="secondary">
            Encuentra lo que necesitas
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight max-w-4xl mb-4 md:mb-6">
            El mercado local de profesionales <span className="text-primary">de confianza</span>
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mb-6 md:mb-10">
            Conecta con expertos locales para cualquier tarea. Desde carpintería hasta clases particulares, encuentra el talento que necesitas cerca de ti.
          </p>
          
          <form onSubmit={handleSearch} className="w-full max-w-2xl relative flex items-center shadow-lg rounded-full bg-background p-1.5 md:p-2 border-2 border-primary/20 focus-within:border-primary transition-colors">
            <Search className="absolute left-4 md:left-6 text-muted-foreground w-5 h-5 md:w-6 md:h-6" />
            <Input 
              className="w-full pl-10 md:pl-14 pr-24 md:pr-32 h-11 md:h-14 border-0 shadow-none focus-visible:ring-0 text-sm md:text-lg rounded-full" 
              placeholder="¿Qué servicio buscas?" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" size="sm" className="absolute right-1.5 md:right-2 h-9 md:h-12 rounded-full px-4 md:px-8 text-xs md:text-base font-bold">
              Buscar
            </Button>
          </form>
          
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mt-6 md:mt-12 text-xs md:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <span>Profesionales verificados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <span>Reseñas reales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <span>Precios transparentes</span>
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />
      </section>

      {/* Featured Listings */}
      <section className="py-10 md:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 md:mb-10">Servicios y Productos Destacados</h2>
          
          {errorFeatured ? (
            <ErrorState message="No se pudieron cargar los servicios destacados" />
          ) : loadingFeatured ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[280px] md:h-[380px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {featuredListings?.flatMap((group) => group.listings).slice(0, 8).map((listing) => (
                <Link key={listing.id} href={`/servicio/${listing.id}`}>
                  <Card className="h-full overflow-hidden cursor-pointer group hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col">
                    <div className="aspect-[4/3] w-full overflow-hidden relative bg-muted">
                      {((listing as any).images?.length > 0 ? (listing as any).images[0] : listing.imageUrl) ? (
                        <img 
                          src={imgUrl((listing as any).images?.length > 0 ? (listing as any).images[0] : listing.imageUrl)} 
                          alt={listing.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl text-muted-foreground/30">
                          {listing.category?.icon}
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 md:top-3 md:right-3 bg-background/90 text-foreground backdrop-blur-sm text-[10px] md:text-xs">
                        {listing.type === "service" ? "Servicio" : "Producto"}
                      </Badge>
                    </div>
                    <CardContent className="p-3 md:p-5 flex-1 flex flex-col">
                      <div className="text-[10px] md:text-xs text-primary font-medium mb-1 md:mb-2 uppercase tracking-wider">{listing.category?.name}</div>
                      <h3 className="font-bold text-sm md:text-lg leading-tight mb-1 md:mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>
                      <div className="hidden sm:flex items-center gap-2 mt-auto pt-3 md:pt-4">
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-muted overflow-hidden flex-shrink-0">
                          {listing.provider?.avatarUrl ? (
                            <img src={imgUrl(listing.provider.avatarUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-secondary text-secondary-foreground flex items-center justify-center text-[8px] md:text-[10px] font-bold">
                              {listing.provider?.name?.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-xs md:text-sm text-muted-foreground truncate">{listing.provider?.name}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-3 md:p-5 pt-0 flex justify-between items-center border-t border-border/50 mt-auto">
                      <div className="font-bold text-base md:text-xl">
                        {(listing as any).sizes?.length > 0 
                          ? <>Desde ${Math.min(...(listing as any).sizes.map((s: any) => s.price || listing.price)).toLocaleString()}</>
                          : <>${listing.price.toLocaleString()}</>}
                      </div>
                      <Button variant="secondary" size="sm" className="font-semibold text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3">Ver</Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          <div className="mt-8 md:mt-12 text-center">
            <Button size="default" variant="outline" asChild className="rounded-full px-6 md:px-8 border-2 text-sm">
              <Link href="/servicios">Ver todos los servicios</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 md:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Explorar por categoría</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs md:text-sm">
              <Link href="/servicios">Ver todo &rarr;</Link>
            </Button>
          </div>

          {errorCategories ? (
            <ErrorState message="No se pudieron cargar las categorías" />
          ) : loadingCategories ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 md:h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-6 md:space-y-10">
              {categories?.filter(c => c.type === "service").length ? (
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Servicios</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4">
                    {categories.filter(c => c.type === "service").map((cat) => (
                      <Link key={cat.id} href={`/servicios?categoryId=${cat.id}&type=service`}>
                        <Card className="h-full cursor-pointer group hover:border-primary/50 hover:shadow-md transition-all hover:-translate-y-1 bg-card/50">
                          <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center text-center h-full gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-xl md:text-2xl">
                              {cat.icon}
                            </div>
                            <span className="font-semibold text-xs md:text-sm leading-tight">{cat.name}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Product categories */}
              {categories?.filter(c => c.type === "product").length ? (
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Productos</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 md:gap-4">
                    {categories.filter(c => c.type === "product").map((cat) => (
                      <Link key={cat.id} href={`/servicios?categoryId=${cat.id}&type=product`}>
                        <Card className="h-full cursor-pointer group hover:border-primary/50 hover:shadow-md transition-all hover:-translate-y-1 bg-card/50">
                          <CardContent className="p-3 md:p-6 flex flex-col items-center justify-center text-center h-full gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-xl md:text-2xl">
                              {cat.icon}
                            </div>
                            <span className="font-semibold text-xs md:text-sm leading-tight">{cat.name}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
      
      {/* Job Board Section */}
      <section className="py-10 md:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="flex-1 text-center md:text-left">
              <Badge className="mb-4 px-3 py-0.5 text-xs font-medium bg-primary/10 text-primary" variant="secondary">
                Nuevo
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Bolsa de Trabajo</h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-lg mb-6">
                Encontrá oportunidades laborales publicadas por empresas verificadas. Postulate fácilmente con tu CV cargado.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Button asChild size="lg" className="rounded-full font-bold">
                  <Link href="/trabajos">
                    <Briefcase className="w-5 h-5 mr-2" />
                    Ver vacantes
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link href="/registro">Registrar empresa</Link>
                </Button>
              </div>
            </div>
            <div className="w-full md:w-auto flex-shrink-0">
              <div className="w-full md:w-64 h-40 md:h-48 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-16 h-16 md:w-20 md:h-20 text-primary/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 md:py-20 lg:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 tracking-tight">¿Eres un profesional?</h2>
          <p className="text-sm md:text-lg lg:text-xl text-primary-foreground/80 mb-6 md:mb-10">
            Únete a Mil Laburos y comienza a ofrecer tus servicios a cientos de clientes locales hoy mismo.
          </p>
          <Button size="lg" variant="secondary" asChild className="rounded-full h-11 md:h-14 px-6 md:px-10 text-sm md:text-lg font-bold">
            <Link href="/registro">Comenzar a vender</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}

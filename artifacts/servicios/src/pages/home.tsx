import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, TrendingUp, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useGetCategories, useGetFeaturedListings } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function Home() {
  const { data: categories, isLoading: loadingCategories } = useGetCategories();
  const { data: featuredListings, isLoading: loadingFeatured } = useGetFeaturedListings();
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
      <section className="relative overflow-hidden bg-primary/5 py-20 lg:py-32">
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <Badge className="mb-6 px-4 py-1 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors" variant="secondary">
            Encuentra lo que necesitas
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight max-w-4xl mb-6">
            El mercado local de profesionales <span className="text-primary">de confianza</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
            Conecta con expertos locales para cualquier tarea. Desde carpintería hasta clases particulares, encuentra el talento que necesitas cerca de ti.
          </p>
          
          <form onSubmit={handleSearch} className="w-full max-w-2xl relative flex items-center shadow-lg rounded-full bg-background p-2 border-2 border-primary/20 focus-within:border-primary transition-colors">
            <Search className="absolute left-6 text-muted-foreground w-6 h-6" />
            <Input 
              className="w-full pl-14 pr-32 h-14 border-0 shadow-none focus-visible:ring-0 text-lg rounded-full" 
              placeholder="¿Qué servicio estás buscando?" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" size="lg" className="absolute right-2 h-12 rounded-full px-8 text-base font-bold">
              Buscar
            </Button>
          </form>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Profesionales verificados</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <span>Reseñas reales</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Precios transparentes</span>
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />
      </section>

      {/* Categories */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Explorar por categoría</h2>
            <Button variant="ghost" asChild>
              <Link href="/servicios">Ver todo &rarr;</Link>
            </Button>
          </div>

          {loadingCategories ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories?.map((cat) => (
                <Link key={cat.id} href={`/servicios?categoryId=${cat.id}`}>
                  <Card className="h-full cursor-pointer group hover:border-primary/50 hover:shadow-md transition-all hover:-translate-y-1 bg-card/50">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-2xl">
                        {cat.icon}
                      </div>
                      <span className="font-semibold text-sm">{cat.name}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold tracking-tight mb-10">Servicios Destacados</h2>
          
          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[400px] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredListings?.flatMap((group) => group.listings).slice(0, 8).map((listing) => (
                <Link key={listing.id} href={`/servicio/${listing.id}`}>
                  <Card className="h-full overflow-hidden cursor-pointer group hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col">
                    <div className="aspect-[4/3] w-full overflow-hidden relative bg-muted">
                      {listing.imageUrl ? (
                        <img 
                          src={listing.imageUrl} 
                          alt={listing.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/30">
                          {listing.category?.icon}
                        </div>
                      )}
                      <Badge className="absolute top-3 right-3 bg-background/90 text-foreground backdrop-blur-sm">
                        {listing.type === "service" ? "Servicio" : "Producto"}
                      </Badge>
                    </div>
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="text-xs text-primary font-medium mb-2 uppercase tracking-wider">{listing.category?.name}</div>
                      <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-auto pt-4">
                        <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex-shrink-0">
                          {listing.provider?.avatarUrl ? (
                            <img src={listing.provider.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold">
                              {listing.provider?.name?.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground truncate">{listing.provider?.name}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-5 pt-0 flex justify-between items-center border-t border-border/50 mt-auto">
                      <div className="font-bold text-xl">${listing.price.toLocaleString()}</div>
                      <Button variant="secondary" size="sm" className="font-semibold">Ver detalles</Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          <div className="mt-12 text-center">
            <Button size="lg" variant="outline" asChild className="rounded-full px-8 border-2">
              <Link href="/servicios">Ver todos los servicios</Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">¿Eres un profesional?</h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10">
            Únete a ServiMarket y comienza a ofrecer tus servicios a cientos de clientes locales hoy mismo. Crea tu perfil en minutos.
          </p>
          <Button size="lg" variant="secondary" asChild className="rounded-full h-14 px-10 text-lg font-bold">
            <Link href="/registro">Comenzar a vender</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}

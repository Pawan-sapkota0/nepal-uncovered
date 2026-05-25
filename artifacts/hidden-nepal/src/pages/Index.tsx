import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Compass, Search, Sparkles, ShieldCheck, Users, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlaceCard } from "@/components/places/PlaceCard";
import { useQuery } from "@tanstack/react-query";
import { places as placesApi, categories as categoriesApi } from "@/lib/api";
import { adaptPlaces } from "@/lib/placeAdapter";
import hero from "@/assets/hero-himalaya.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: placesResult } = useQuery({
    queryKey: ["places", undefined, undefined, undefined, undefined, false],
    queryFn: () => placesApi.list({ limit: 100 }),
    staleTime: 60_000,
  });
  const { data: apiCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
    staleTime: 300_000,
  });

  const approved = adaptPlaces(placesResult?.data ?? []);
  const trending = [...approved].sort((a, b) => b.views - a.views).slice(0, 4);
  const hidden = approved.filter((p) => p.hidden).slice(0, 6);
  const featured = approved.filter((p) => p.featured).slice(0, 3);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/explore${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={hero}
            alt="Himalayan valley at golden hour with prayer flags"
            className="h-full w-full object-cover animate-slow-zoom"
            width={1920}
            height={1280}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
        </div>

        <div className="relative container pt-32 pb-20">
          <div className="max-w-3xl text-primary-foreground animate-fade-up">
            <Badge className="bg-white/15 text-primary-foreground border-white/20 backdrop-blur mb-6 gap-1.5 hover:bg-white/20">
              <Sparkles className="h-3 w-3" /> A community atlas of Nepal
            </Badge>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-balance">
              Discover Nepal{" "}
              <span className="italic text-saffron">beyond</span>{" "}
              the obvious.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-2xl leading-relaxed">
              From quiet hilltop villages to lakes nobody puts on postcards — explore the places locals love, with the practical, safety and cultural detail you actually need.
            </p>

            <form onSubmit={onSearch} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a place, district or experience…"
                  className="h-14 pl-12 bg-background/95 border-0 text-base shadow-elevated"
                />
              </div>
              <Button type="submit" size="xl" variant="hero" className="shrink-0">
                Explore <ArrowRight className="h-5 w-5" />
              </Button>
            </form>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-primary-foreground/80">
              <div className="flex items-center gap-2"><Compass className="h-4 w-4" /> {approved.length}+ curated places</div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Community contributed</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Safety info on every page</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-primary-foreground/70 text-xs uppercase tracking-[0.3em] hidden md:block">
          Scroll to explore
        </div>
      </section>

      {/* FEATURED */}
      <section className="container py-20 md:py-28">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Editor's picks</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">Places we love right now</h2>
          </div>
          <Link to="/explore" className="hidden sm:inline-flex text-sm font-medium text-primary hover:underline items-center gap-1">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((p, i) => (
            <PlaceCard key={p.id} place={p} index={i} variant="feature" />
          ))}
        </div>
      </section>

      {/* HIDDEN GEMS */}
      <section className="bg-gradient-warm py-20 md:py-28">
        <div className="container">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3 inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Hidden gems
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
                The Nepal that isn't on the postcard
              </h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                Quiet valleys, stone villages and high lakes shared by the people who actually walk these trails.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hidden.map((p, i) => (
              <PlaceCard key={p.id} place={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Browse by category</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            How would you like to explore?
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {apiCategories.map((c, i) => (
            <Link
              key={c.slug}
              to={`/explore?category=${c.slug}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 hover-lift animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="text-3xl mb-3">
                {c.slug === "lakes" && "🏞️"}
                {c.slug === "mountains" && "🏔️"}
                {c.slug === "villages" && "🏘️"}
                {c.slug === "heritage" && "🛕"}
                {c.slug === "wildlife" && "🦏"}
                {c.slug === "trekking" && "🥾"}
                {c.slug === "spiritual" && "🪷"}
                {c.slug === "valleys" && "🌄"}
              </div>
              <div className="font-display text-lg font-semibold">{c.name}</div>
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* TRENDING */}
      <section className="container pb-20 md:pb-28">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Trending now</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">Most explored this season</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trending.map((p, i) => (
            <PlaceCard key={p.id} place={p} index={i} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-mountain p-10 md:p-16 text-primary-foreground shadow-elevated">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-saffron/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <Map className="h-8 w-8 mb-4 opacity-80" />
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight text-balance">
              Know a place that deserves to be found?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg leading-relaxed">
              Hidden Nepal grows from the people who walk it. Share a place, write its story, and help the next traveller arrive prepared.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" variant="hero" onClick={() => navigate("/auth?mode=signup")}>
                Become a contributor <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/explore")} className="bg-white/10 text-primary-foreground border-white/30 hover:bg-white/20 hover:text-primary-foreground">
                Keep exploring
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;

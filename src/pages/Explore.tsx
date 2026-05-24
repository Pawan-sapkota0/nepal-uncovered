import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bookmark, LayoutGrid, List, Save, Search, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlaceCard } from "@/components/places/PlaceCard";
import { Highlight } from "@/components/Highlight";
import { useApp } from "@/store/useApp";
import { categories, districts, provinces } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { MapPin, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Sort = "popular" | "newest" | "name";
type View = "grid" | "list";

const Explore = () => {
  const { places, filterPresets, savePreset, deletePreset } = useApp();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [category, setCategory] = useState(params.get("category") ?? "all");
  const [province, setProvince] = useState(params.get("province") ?? "all");
  const [district, setDistrict] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [hiddenOnly, setHiddenOnly] = useState(params.get("hidden") === "true");
  const [sort, setSort] = useState<Sort>("popular");
  const [view, setView] = useState<View>("grid");
  const [presetName, setPresetName] = useState("");
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);

  // Debounce keyword search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery) next.set("q", debouncedQuery);
    if (category !== "all") next.set("category", category);
    if (province !== "all") next.set("province", province);
    if (hiddenOnly) next.set("hidden", "true");
    setParams(next, { replace: true });
  }, [debouncedQuery, category, province, hiddenOnly, setParams]);

  const filtered = useMemo(() => {
    let list = places.filter((p) => p.status === "approved");
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.category.includes(q)
      );
    }
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (province !== "all") list = list.filter((p) => p.province === province);
    if (district !== "all") list = list.filter((p) => p.district === district);
    if (difficulty !== "all") list = list.filter((p) => p.travel.difficulty === difficulty);
    if (hiddenOnly) list = list.filter((p) => p.hidden);

    if (sort === "popular") list.sort((a, b) => b.views - a.views);
    if (sort === "newest") list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [places, debouncedQuery, category, province, district, difficulty, hiddenOnly, sort]);

  const reset = () => {
    setQuery(""); setCategory("all"); setProvince("all"); setDistrict("all");
    setDifficulty("all"); setHiddenOnly(false);
  };

  const activeCount = [
    debouncedQuery, category !== "all" && category, province !== "all" && province,
    district !== "all" && district, difficulty !== "all" && difficulty, hiddenOnly && "hidden",
  ].filter(Boolean).length;

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    savePreset({
      name,
      filters: { query: debouncedQuery, category, province, district, difficulty, hiddenOnly },
    });
    setPresetName("");
    setPresetDialogOpen(false);
    toast({ title: "Preset saved", description: `"${name}" is ready to apply anytime.` });
  };

  const applyPreset = (id: string) => {
    const p = filterPresets.find((fp) => fp.id === id);
    if (!p) return;
    setQuery(p.filters.query);
    setDebouncedQuery(p.filters.query);
    setCategory(p.filters.category);
    setProvince(p.filters.province);
    setDistrict(p.filters.district);
    setDifficulty(p.filters.difficulty);
    setHiddenOnly(p.filters.hiddenOnly);
  };

  return (
    <div className="pt-24 pb-20">
      {/* Header */}
      <div className="bg-gradient-warm border-b border-border">
        <div className="container py-12">
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Explore</div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Every place in the atlas
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Filter by region, category and difficulty — or surface only the hidden gems.
          </p>

          <div className="mt-8 relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search places, districts, keywords…"
              className="h-12 pl-12 pr-10 bg-background border-border shadow-soft"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {query !== debouncedQuery && (
              <span className="absolute -bottom-5 left-1 text-xs text-muted-foreground animate-pulse">
                Searching…
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
            </div>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          <button
            onClick={() => setHiddenOnly((v) => !v)}
            className={cn(
              "w-full flex items-center justify-between rounded-lg border p-3 text-sm transition",
              hiddenOnly
                ? "bg-saffron/15 border-saffron text-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-saffron" /> Hidden gems only
            </span>
            <span className={cn(
              "h-5 w-9 rounded-full p-0.5 transition",
              hiddenOnly ? "bg-saffron" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "block h-4 w-4 rounded-full bg-background transition-transform",
                hiddenOnly && "translate-x-4"
              )} />
            </span>
          </button>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Province</label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All provinces</SelectItem>
                {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">District</label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All districts</SelectItem>
                {districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any difficulty</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Challenging">Challenging</SelectItem>
                <SelectItem value="Extreme">Extreme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> place{filtered.length === 1 ? "" : "s"} found
            </p>
            <div className="flex items-center gap-3">
              <Select value={sort} onValueChange={(v: Sort) => setSort(v)}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most popular</SelectItem>
                  <SelectItem value="newest">Recently added</SelectItem>
                  <SelectItem value="name">A → Z</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md border border-border p-0.5">
                <button
                  onClick={() => setView("grid")}
                  className={cn("h-8 w-8 grid place-items-center rounded-sm", view === "grid" ? "bg-muted" : "hover:bg-muted/60")}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn("h-8 w-8 grid place-items-center rounded-sm", view === "list" ? "bg-muted" : "hover:bg-muted/60")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-16 text-center">
              <p className="font-display text-xl mb-2">No matches yet</p>
              <p className="text-muted-foreground text-sm mb-4">Try removing some filters or searching for something different.</p>
              <Button variant="outline" onClick={reset}>Reset filters</Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((p, i) => <PlaceCard key={p.id} place={p} index={i} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/place/${p.slug}`}
                  className="group flex gap-5 rounded-xl border border-border bg-card p-3 hover-lift animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="h-32 w-44 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img src={p.coverImage} alt={p.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.district}, {p.province}</span>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{p.views.toLocaleString()}</span>
                      {p.hidden && <Badge className="bg-saffron text-saffron-foreground border-0 gap-1"><Sparkles className="h-3 w-3" />Hidden gem</Badge>}
                    </div>
                    <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">{p.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.shortDescription}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize text-xs">{p.category}</Badge>
                      <Badge variant="outline" className="text-xs">{p.travel.difficulty}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explore;

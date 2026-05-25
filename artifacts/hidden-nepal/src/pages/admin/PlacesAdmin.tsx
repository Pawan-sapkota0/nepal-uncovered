import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, places as placesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const PlacesAdmin = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: result, isLoading } = useQuery({
    queryKey: ["places", "admin-list"],
    queryFn: () => placesApi.list({ limit: 100 }),
  });

  const toggleFeaturedMut = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => admin.updatePlace(id, { featured }),
    onSuccess: (_, { featured }) => { toast.success(featured ? "Added to featured" : "Removed from featured"); qc.invalidateQueries({ queryKey: ["places"] }); },
    onError: () => toast.error("Failed to update"),
  });

  const list = (result?.data ?? [])
    .filter((p) => p.status === "approved")
    .filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.district.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Catalogue</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Places</h1>
      <p className="text-muted-foreground mt-1">Feature or review published places.</p>

      <div className="mt-8 mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search places…" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Place</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Province</th>
                <th className="px-4 py-3 font-medium text-right">Views</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-14 rounded-md bg-muted shrink-0 flex items-center justify-center text-xl">🏔</div>
                      <div className="min-w-0">
                        <Link to={`/place/${p.slug}`} className="font-medium hover:text-primary truncate block">{p.title}</Link>
                        <div className="text-xs text-muted-foreground truncate">{p.district}</div>
                      </div>
                      {p.featured && <Badge className="bg-saffron text-saffron-foreground border-0 ml-2 shrink-0">Featured</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell capitalize">{p.categorySlug ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{p.province}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.views.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => toggleFeaturedMut.mutate({ id: p.id, featured: !p.featured })}
                        aria-label="Toggle featured"
                        disabled={toggleFeaturedMut.isPending}
                      >
                        <Star className={`h-4 w-4 ${p.featured ? "fill-saffron text-saffron" : ""}`} />
                      </Button>
                      <Button asChild variant="ghost" size="icon">
                        <Link to={`/place/${p.slug}`} aria-label="View"><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No places match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlacesAdmin;

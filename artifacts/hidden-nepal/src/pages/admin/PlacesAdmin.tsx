import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin, type AdminPlaceRow } from "@/lib/api";
import { getImageUrl } from "@/lib/imageUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, Search, ExternalLink, Loader2, Pencil, Trash2, Mountain, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EditPlaceModal } from "./EditPlaceModal";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "changes_requested";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "changes_requested", label: "Needs edits" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800" },
  changes_requested: { label: "Needs edits", className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
};

const PlacesAdmin = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPlaceRow | null>(null);

  const { data: allPlaces = [], isLoading } = useQuery({
    queryKey: ["admin-places", statusFilter, q],
    queryFn: () => admin.listPlaces({
      status: statusFilter !== "all" ? statusFilter : undefined,
      query: q || undefined,
    }),
    staleTime: 10_000,
  });

  const toggleFeaturedMut = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      admin.updatePlace(id, { featured }),
    onSuccess: (_, { featured }) => {
      toast.success(featured ? "Added to featured" : "Removed from featured");
      qc.invalidateQueries({ queryKey: ["admin-places"] });
      qc.invalidateQueries({ queryKey: ["places"] });
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => admin.deletePlace(id),
    onSuccess: () => {
      toast.success("Place deleted");
      qc.invalidateQueries({ queryKey: ["admin-places"] });
      qc.invalidateQueries({ queryKey: ["places"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete place"),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Catalogue</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Places</h1>
      <p className="text-muted-foreground mt-1">Manage, edit, feature and delete places in the atlas.</p>

      {/* Search + status tabs */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search places or districts…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                statusFilter === tab.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : allPlaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
            <Mountain className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No places found{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Place</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Province</th>
                  <th className="px-4 py-3 font-medium hidden xl:table-cell">Submitted by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Views</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allPlaces.map((p) => (
                  <PlaceRow
                    key={p.id}
                    place={p}
                    onEdit={() => setEditId(p.id)}
                    onDelete={() => setDeleteTarget(p)}
                    onToggleFeatured={() =>
                      toggleFeaturedMut.mutate({ id: p.id, featured: !p.featured })
                    }
                    featurePending={toggleFeaturedMut.isPending}
                  />
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
              {allPlaces.length} place{allPlaces.length === 1 ? "" : "s"}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <EditPlaceModal
        placeId={editId}
        open={!!editId}
        onClose={() => setEditId(null)}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the place and all its submissions. Contributors can still
              submit a corrected version. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface PlaceRowProps {
  place: AdminPlaceRow;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  featurePending: boolean;
}

const PlaceRow = ({ place, onEdit, onDelete, onToggleFeatured, featurePending }: PlaceRowProps) => {
  const badgeCfg = STATUS_BADGE[place.status] ?? STATUS_BADGE.pending;
  const imgSrc = place.coverImage ? getImageUrl(place.coverImage) : null;

  return (
    <tr className="hover:bg-muted/30 transition">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-14 rounded-md bg-muted shrink-0 overflow-hidden flex items-center justify-center">
            {imgSrc ? (
              <img src={imgSrc} alt={place.title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <ImageOff className="h-4 w-4 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate max-w-[200px]">{place.title}</div>
            <div className="text-xs text-muted-foreground truncate">{place.district}</div>
          </div>
          {place.featured && (
            <Badge className="bg-saffron text-saffron-foreground border-0 shrink-0 text-[10px] px-1.5">
              Featured
            </Badge>
          )}
          {place.hidden && (
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5">Hidden</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell capitalize text-muted-foreground">
        {place.categorySlug ?? "—"}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
        {place.province}
      </td>
      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
        {place.submitterName ?? "—"}
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
          badgeCfg.className
        )}>
          {badgeCfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-muted-foreground">
        {place.views.toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={onToggleFeatured}
            disabled={featurePending}
            title={place.featured ? "Remove from featured" : "Feature on homepage"}
          >
            <Star className={cn("h-4 w-4", place.featured ? "fill-saffron text-saffron" : "")} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={onEdit}
            title="Edit place"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {place.status === "approved" && (
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link to={`/place/${place.slug}`} title="View live">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
            onClick={onDelete}
            title="Delete place"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default PlacesAdmin;

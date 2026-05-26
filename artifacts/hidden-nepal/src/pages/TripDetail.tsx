import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trips as tripsApi, type ApiTripPlace } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { adaptPlace } from "@/lib/placeAdapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, CalendarDays, MapPin, Pencil, Trash2, Loader2,
  GripVertical, StickyNote, ExternalLink, Route,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [editingTrip, setEditingTrip] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", startDate: "", endDate: "" });
  const [editingItem, setEditingItem] = useState<ApiTripPlace | null>(null);
  const [itemNotes, setItemNotes] = useState("");
  const [itemDate, setItemDate] = useState("");

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => tripsApi.get(id!),
    enabled: !!id && !!user,
  });

  const updateTripMutation = useMutation({
    mutationFn: () =>
      tripsApi.update(id!, {
        title: editForm.title,
        description: editForm.description || undefined,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      setEditingTrip(false);
    },
    onError: () => toast({ title: "Failed to update trip", variant: "destructive" }),
  });

  const removePlaceMutation = useMutation({
    mutationFn: (itemId: string) => tripsApi.removePlace(id!, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: () => toast({ title: "Failed to remove place", variant: "destructive" }),
  });

  const updateItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      tripsApi.updatePlace(id!, itemId, {
        notes: itemNotes || null,
        visitDate: itemDate || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", id] });
      setEditingItem(null);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="container pt-32 pb-20 text-center">
        <Button onClick={() => navigate("/auth")}>Sign in to view trips</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container pt-32 pb-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container pt-32 pb-20 text-center">
        <p className="font-display text-2xl mb-4">Trip not found.</p>
        <Button onClick={() => navigate("/trips")}>Back to trips</Button>
      </div>
    );
  }

  const openEditTrip = () => {
    setEditForm({
      title: trip.title,
      description: trip.description ?? "",
      startDate: trip.startDate ?? "",
      endDate: trip.endDate ?? "",
    });
    setEditingTrip(true);
  };

  const openEditItem = (item: ApiTripPlace) => {
    setEditingItem(item);
    setItemNotes(item.tripPlace.notes ?? "");
    setItemDate(item.tripPlace.visitDate ?? "");
  };

  const totalDays = trip.places.reduce(
    (sum, p) => sum + (p.place.durationDays ?? 1), 0
  );

  const dateRange = [trip.startDate, trip.endDate].filter(Boolean).join(" → ");

  return (
    <div className="container pt-28 pb-24">
      {/* Back */}
      <button
        onClick={() => navigate("/trips")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All trips
      </button>

      {/* Trip header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">
            {trip.places.length} {trip.places.length === 1 ? "destination" : "destinations"}
            {totalDays > 0 && ` · ${totalDays} day${totalDays !== 1 ? "s" : ""} total`}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
            {trip.title}
          </h1>
          {trip.description && (
            <p className="text-lg text-muted-foreground max-w-2xl">{trip.description}</p>
          )}
          {dateRange && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {dateRange}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={openEditTrip} className="gap-2 shrink-0">
          <Pencil className="h-4 w-4" /> Edit trip
        </Button>
      </div>

      {/* Summary bar */}
      {trip.places.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <StatChip label="Destinations" value={String(trip.places.length)} />
          <StatChip label="Total days" value={`${totalDays}`} />
          <StatChip
            label="Provinces"
            value={String(new Set(trip.places.map((p) => p.place.province)).size)}
          />
          <StatChip
            label="Hidden gems"
            value={String(trip.places.filter((p) => p.place.hidden).length)}
          />
        </div>
      )}

      {/* Place list */}
      {trip.places.length === 0 ? (
        <EmptyItinerary />
      ) : (
        <div className="space-y-5">
          {trip.places.map((item, idx) => (
            <PlaceRow
              key={item.tripPlace.id}
              item={item}
              index={idx}
              onEdit={() => openEditItem(item)}
              onRemove={() => removePlaceMutation.mutate(item.tripPlace.id)}
              removing={removePlaceMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Explore CTA */}
      <div className="mt-12 rounded-2xl bg-gradient-warm border border-border p-8 text-center">
        <Route className="h-8 w-8 mx-auto mb-3 text-accent" />
        <h3 className="font-display text-xl mb-2">Add more destinations</h3>
        <p className="text-muted-foreground mb-5">
          Browse the atlas and save places directly to this trip from any place detail page.
        </p>
        <Button asChild>
          <Link to="/explore">Explore places</Link>
        </Button>
      </div>

      {/* Edit trip dialog */}
      <Dialog open={editingTrip} onOpenChange={setEditingTrip}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Trip name *</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start date</label>
                <Input
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End date</label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrip(false)}>Cancel</Button>
            <Button
              disabled={!editForm.title.trim() || updateTripMutation.isPending}
              onClick={() => updateTripMutation.mutate()}
            >
              {updateTripMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingItem?.place.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Planned visit date</label>
              <Input
                type="date"
                value={itemDate}
                onChange={(e) => setItemDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Textarea
                rows={4}
                placeholder="Things to do, who's coming, packing list…"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button
              onClick={() => updateItemMutation.mutate(editingItem!.tripPlace.id)}
              disabled={updateItemMutation.isPending}
            >
              {updateItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PlaceRow = ({
  item, index, onEdit, onRemove, removing,
}: {
  item: ApiTripPlace; index: number; onEdit: () => void; onRemove: () => void; removing: boolean;
}) => {
  const place = item.place;
  const tp = item.tripPlace;

  return (
    <div className="group flex gap-4 rounded-2xl border border-border bg-card shadow-soft overflow-hidden hover:border-primary/30 transition-colors">
      {/* Step number */}
      <div className="hidden sm:flex w-14 shrink-0 items-center justify-center bg-muted text-lg font-display font-semibold text-muted-foreground">
        {index + 1}
      </div>

      {/* Cover image */}
      {place.coverImage && (
        <div className="w-28 sm:w-36 shrink-0 overflow-hidden">
          <img
            src={place.coverImage}
            alt={place.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 p-4 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {place.hidden && (
                <Badge className="bg-saffron text-saffron-foreground border-0 text-[10px] px-1.5 py-0">
                  Hidden gem
                </Badge>
              )}
              <span className="text-xs text-muted-foreground capitalize">{place.categorySlug}</span>
            </div>
            <h3 className="font-display text-lg font-semibold leading-snug">{place.title}</h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Edit notes / date"
            >
              <StickyNote className="h-4 w-4" />
            </button>
            <Link
              to={`/place/${place.slug}`}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="View place"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              onClick={onRemove}
              disabled={removing}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Remove from trip"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {place.district}, {place.province}
          </span>
          {place.durationDays && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {place.durationDays}d suggested
            </span>
          )}
          {tp.visitDate && (
            <span className="inline-flex items-center gap-1 text-accent font-medium">
              <CalendarDays className="h-3 w-3" />
              Visiting {tp.visitDate}
            </span>
          )}
        </div>

        {tp.notes && (
          <p className="text-sm text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 mt-2 line-clamp-2">
            {tp.notes}
          </p>
        )}
      </div>
    </div>
  );
};

const StatChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
    <div className="font-display text-2xl font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
  </div>
);

const EmptyItinerary = () => (
  <div className="text-center py-20 border border-dashed border-border rounded-2xl">
    <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
    <h3 className="font-display text-xl mb-2">No places yet</h3>
    <p className="text-muted-foreground max-w-sm mx-auto">
      Browse the atlas and use the "Add to trip" button on any place to add it here.
    </p>
  </div>
);

export default TripDetail;

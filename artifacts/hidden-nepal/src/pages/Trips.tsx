import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trips as tripsApi, type ApiTrip } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin, CalendarDays, Plus, Trash2, Loader2, Route, ArrowRight, PenLine,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Trips = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startDate: "", endDate: "" });

  const { data: tripList, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: tripsApi.list,
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      tripsApi.create({
        title: form.title,
        description: form.description || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }),
    onSuccess: (trip) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      setCreating(false);
      setForm({ title: "", description: "", startDate: "", endDate: "" });
      navigate(`/trips/${trip.id}`);
    },
    onError: () => toast({ title: "Failed to create trip", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tripsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Trip deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="container pt-32 pb-20 text-center">
        <Route className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="font-display text-2xl mb-2">Sign in to plan trips</h2>
        <p className="text-muted-foreground mb-6">Create itineraries, add places and plan your Nepal adventure.</p>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="container pt-28 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-1">My plans</div>
          <h1 className="font-display text-4xl font-semibold">Travel itineraries</h1>
          <p className="text-muted-foreground mt-2">
            Organise places into trips with notes and travel dates.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> New trip
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : !tripList?.length ? (
        <EmptyState onNew={() => setCreating(true)} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tripList.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onOpen={() => navigate(`/trips/${trip.id}`)}
              onDelete={() => deleteMutation.mutate(trip.id)}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create a new trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Trip name *</label>
              <Input
                placeholder="e.g. Annapurna Circuit 2025"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                placeholder="What's the plan?"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button
              disabled={!form.title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TripCard = ({
  trip, onOpen, onDelete, deleting,
}: {
  trip: ApiTrip; onOpen: () => void; onDelete: () => void; deleting: boolean;
}) => {
  const hasDate = trip.startDate || trip.endDate;
  const dateStr = [trip.startDate, trip.endDate].filter(Boolean).join(" → ");

  return (
    <div
      className="group relative rounded-2xl border border-border bg-card shadow-soft hover-lift overflow-hidden cursor-pointer"
      onClick={onOpen}
    >
      {/* Color band */}
      <div className="h-2 bg-gradient-mountain" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {trip.title}
          </h3>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            aria-label="Delete trip"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {trip.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{trip.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{trip.placeCount ?? 0} {trip.placeCount === 1 ? "place" : "places"}</span>
          </span>
          {hasDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{dateStr}</span>
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1 text-sm text-primary font-medium">
          View itinerary <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ onNew }: { onNew: () => void }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="h-20 w-20 rounded-2xl bg-muted grid place-items-center mb-6">
      <Route className="h-10 w-10 text-muted-foreground" />
    </div>
    <h3 className="font-display text-2xl mb-2">No trips yet</h3>
    <p className="text-muted-foreground max-w-sm mb-8">
      Create your first itinerary, then save places to it as you browse the atlas.
    </p>
    <Button onClick={onNew} className="gap-2">
      <Plus className="h-4 w-4" /> Plan your first trip
    </Button>
  </div>
);

export default Trips;

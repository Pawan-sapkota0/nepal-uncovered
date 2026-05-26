import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trips as tripsApi } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Check, Route, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddToTripModalProps {
  open: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
}

export function AddToTripModal({ open, onClose, placeId, placeName }: AddToTripModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<"list" | "create">("list");
  const [newTitle, setNewTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null); // tripId just added to

  const { data: tripList, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: tripsApi.list,
    enabled: !!user && open,
  });

  const addMutation = useMutation({
    mutationFn: (tripId: string) =>
      tripsApi.addPlace(tripId, { placeId, notes: notes || undefined, visitDate: visitDate || undefined }),
    onSuccess: (_, tripId) => {
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      setAdded(tripId);
    },
    onError: () => toast({ title: "Failed to add place", variant: "destructive" }),
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      const trip = await tripsApi.create({ title: newTitle });
      await tripsApi.addPlace(trip.id, { placeId, notes: notes || undefined, visitDate: visitDate || undefined });
      return trip.id;
    },
    onSuccess: (tripId) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      setAdded(tripId);
    },
    onError: () => toast({ title: "Failed to create trip", variant: "destructive" }),
  });

  const handleClose = () => {
    setStep("list");
    setNewTitle("");
    setNotes("");
    setVisitDate("");
    setSelectedTripId(null);
    setAdded(null);
    onClose();
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Sign in required</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm mt-2 mb-6">
            Create an account to plan trips and save places.
          </p>
          <Button onClick={() => { handleClose(); navigate("/auth"); }}>Sign in</Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (added) {
    const trip = tripList?.find((t) => t.id === added);
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="py-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 grid place-items-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-display text-xl mb-1">Added!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              <span className="font-medium">{placeName}</span> was added to{" "}
              <span className="font-medium">{trip?.title ?? "your trip"}</span>.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleClose}>Done</Button>
              <Button onClick={() => { handleClose(); navigate(`/trips/${added}`); }}>
                View trip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add to a trip</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            <MapPin className="h-3 w-3 inline mr-1" />
            {placeName}
          </p>
        </DialogHeader>

        {/* Optional notes + date for any flow */}
        <div className="space-y-3 pb-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Visit date (optional)
            </label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Notes (optional)
            </label>
            <Textarea
              rows={2}
              placeholder="Things to do, reminders…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          {step === "list" ? (
            <>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !tripList?.length ? (
                <div className="text-center py-6">
                  <Route className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">No trips yet. Create one first.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 mb-3">
                  {tripList.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => setSelectedTripId(trip.id)}
                      className={cn(
                        "w-full text-left rounded-xl border px-4 py-3 transition-all",
                        selectedTripId === trip.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <div className="font-medium text-sm">{trip.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {trip.placeCount ?? 0} {trip.placeCount === 1 ? "place" : "places"}
                        {(trip.startDate || trip.endDate) && ` · ${[trip.startDate, trip.endDate].filter(Boolean).join(" → ")}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="gap-1.5 flex-1"
                  onClick={() => setStep("create")}
                >
                  <Plus className="h-4 w-4" /> New trip
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedTripId || addMutation.isPending}
                  onClick={() => addMutation.mutate(selectedTripId!)}
                >
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to trip"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Trip name *
                </label>
                <Input
                  autoFocus
                  placeholder="e.g. Annapurna spring 2025"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setStep("list")}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!newTitle.trim() || createAndAddMutation.isPending}
                  onClick={() => createAndAddMutation.mutate()}
                >
                  {createAndAddMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & add"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

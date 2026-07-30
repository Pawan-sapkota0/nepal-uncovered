import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { trips, type ApiTrip, type TripType, type TripStatus } from "@/lib/api";
import { X, Plus } from "lucide-react";

interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: ApiTrip;
}

export function TripFormDialog({ open, onOpenChange, trip }: TripFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!trip;

  const [title, setTitle] = useState(trip?.title || "");
  const [description, setDescription] = useState(trip?.description || "");
  const [startDate, setStartDate] = useState(trip?.startDate || "");
  const [endDate, setEndDate] = useState(trip?.endDate || "");
  const [estimatedDays, setEstimatedDays] = useState(trip?.estimatedDays?.toString() || "");
  const [tripType, setTripType] = useState<TripType | "">(trip?.tripType || "");
  const [estimatedBudget, setEstimatedBudget] = useState(trip?.estimatedBudget || "");
  const [numTravelers, setNumTravelers] = useState(trip?.numTravelers?.toString() || "1");
  const [emergencyContact, setEmergencyContact] = useState(trip?.emergencyContact || "");
  const [notes, setNotes] = useState(trip?.notes || "");
  const [status, setStatus] = useState<TripStatus>(trip?.status || "planning");
  const [destinations, setDestinations] = useState<string[]>(trip?.destinations || []);
  const [newDestination, setNewDestination] = useState("");
  const [documents, setDocuments] = useState<{ name: string; description?: string }[]>(
    trip?.importantDocuments || []
  );
  const [newDocName, setNewDocName] = useState("");
  const [newDocDesc, setNewDocDesc] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: any) => trips.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Trip created successfully" });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create trip", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => trips.update(trip!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip", trip!.id] });
      toast({ title: "Trip updated successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update trip", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setEstimatedDays("");
    setTripType("");
    setEstimatedBudget("");
    setNumTravelers("1");
    setEmergencyContact("");
    setNotes("");
    setStatus("planning");
    setDestinations([]);
    setDocuments([]);
    setNewDestination("");
    setNewDocName("");
    setNewDocDesc("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Trip name is required", variant: "destructive" });
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
      tripType: tripType || undefined,
      estimatedBudget: estimatedBudget || undefined,
      numTravelers: Number(numTravelers) || 1,
      emergencyContact: emergencyContact.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      destinations,
      importantDocuments: documents,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addDestination = () => {
    if (newDestination.trim() && !destinations.includes(newDestination.trim())) {
      setDestinations([...destinations, newDestination.trim()]);
      setNewDestination("");
    }
  };

  const removeDestination = (dest: string) => {
    setDestinations(destinations.filter((d) => d !== dest));
  };

  const addDocument = () => {
    if (newDocName.trim()) {
      setDocuments([...documents, { name: newDocName.trim(), description: newDocDesc.trim() || undefined }]);
      setNewDocName("");
      setNewDocDesc("");
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const autoCalculateDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) setEstimatedDays(diff.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Trip" : "Create New Trip"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update your trip details" : "Plan your next adventure in Nepal"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="trip-title">Trip Name *</Label>
              <Input
                id="trip-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Annapurna Circuit Trek"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trip-desc">Description</Label>
              <Textarea
                id="trip-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief overview of your trip..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trip-start">Start Date</Label>
                <Input
                  id="trip-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setTimeout(autoCalculateDays, 100);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-end">End Date</Label>
                <Input
                  id="trip-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setTimeout(autoCalculateDays, 100);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trip-days">Estimated Total Days</Label>
                <Input
                  id="trip-days"
                  type="number"
                  min="1"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  placeholder="7"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-travelers">Number of Travelers</Label>
                <Input
                  id="trip-travelers"
                  type="number"
                  min="1"
                  value={numTravelers}
                  onChange={(e) => setNumTravelers(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trip-type">Trip Type</Label>
                <Select value={tripType} onValueChange={(v) => setTripType(v as TripType)}>
                  <SelectTrigger id="trip-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trekking">Trekking</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="road_trip">Road Trip</SelectItem>
                    <SelectItem value="wildlife">Wildlife</SelectItem>
                    <SelectItem value="pilgrimage">Pilgrimage</SelectItem>
                    <SelectItem value="photography">Photography</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TripStatus)}>
                  <SelectTrigger id="trip-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trip-budget">Estimated Total Budget (NPR)</Label>
              <Input
                id="trip-budget"
                type="number"
                min="0"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="50000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trip-emergency">Emergency Contact</Label>
              <Input
                id="trip-emergency"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Name: +977 9812345678"
              />
            </div>

            <div className="space-y-2">
              <Label>Destinations</Label>
              <div className="flex gap-2">
                <Input
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="Add a destination..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDestination())}
                />
                <Button type="button" onClick={addDestination} size="icon" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {destinations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {destinations.map((dest, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                    >
                      {dest}
                      <button type="button" onClick={() => removeDestination(dest)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Important Documents</Label>
              <div className="space-y-2">
                <Input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document name (e.g., Passport)"
                />
                <div className="flex gap-2">
                  <Input
                    value={newDocDesc}
                    onChange={(e) => setNewDocDesc(e.target.value)}
                    placeholder="Description (optional)"
                  />
                  <Button type="button" onClick={addDocument} size="icon" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {documents.length > 0 && (
                <div className="space-y-1 mt-2">
                  {documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 p-2 bg-secondary/50 rounded-md text-sm"
                    >
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        {doc.description && <div className="text-xs text-muted-foreground">{doc.description}</div>}
                      </div>
                      <button type="button" onClick={() => removeDocument(i)} className="hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trip-notes">Notes</Label>
              <Textarea
                id="trip-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about your trip..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1">
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : isEdit
                  ? "Update Trip"
                  : "Create Trip"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

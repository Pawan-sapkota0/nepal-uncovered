import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/store/useAuth";
import { trips, type TripStatus } from "@/lib/api";
import { TripFormDialog } from "@/components/trips/TripFormDialog";
import { DayCard } from "@/components/trips/DayCard";
import { BudgetDashboard } from "@/components/trips/BudgetDashboard";
import { ChecklistTab } from "@/components/trips/ChecklistTab";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Users,
  MapPin,
  FileText,
  Phone,
  Plus,
  Trash2,
  Map,
} from "lucide-react";

const statusColors: Record<TripStatus, string> = {
  planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ongoing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => trips.get(id!),
    enabled: !!id && !!user,
  });

  const { data: days } = useQuery({
    queryKey: ["trip-days", id],
    queryFn: () => trips.getDays(id!),
    enabled: !!id && !!user,
  });

  const { data: budget } = useQuery({
    queryKey: ["trip-budget", id],
    queryFn: () => trips.getBudget(id!),
    enabled: !!id && !!user,
  });

  const deleteTripMutation = useMutation({
    mutationFn: () => trips.remove(id!),
    onSuccess: () => {
      toast({ title: "Trip deleted" });
      navigate("/trips");
    },
  });

  const createDayMutation = useMutation({
    mutationFn: (dayNumber: number) => trips.createDay(id!, { dayNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-days", id] });
      toast({ title: "Day added" });
    },
  });

  const removePlaceMutation = useMutation({
    mutationFn: (itemId: string) => trips.removePlace(id!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast({ title: "Place removed" });
    },
  });

  const handleGenerateDays = () => {
    if (!trip?.startDate || !trip?.endDate) {
      toast({ title: "Set start and end dates first", variant: "destructive" });
      return;
    }
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (dayCount <= 0 || dayCount > 100) {
      toast({ title: "Invalid date range", variant: "destructive" });
      return;
    }

    for (let i = 1; i <= dayCount; i++) {
      createDayMutation.mutate(i);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-6">Sign in to view trip details</p>
        <Button asChild>
          <Link to="/auth">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Card className="p-6">
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl mb-4">Trip not found</h1>
        <Button asChild>
          <Link to="/trips">Back to Trips</Link>
        </Button>
      </div>
    );
  }

  const totalDays = trip.estimatedDays || 0;
  const totalPlaces = trip.places.length;
  const budgetRemaining = budget?.budgetRemaining || 0;
  const totalPlannedCost = budget?.totalPlannedCost || 0;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4 gap-2">
          <Link to="/trips">
            <ArrowLeft className="w-4 h-4" />
            Back to Trips
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-display text-4xl mb-3">{trip.title}</h1>
            <div className="flex gap-2 flex-wrap">
              <Badge className={statusColors[trip.status]}>{trip.status}</Badge>
              {trip.tripType && (
                <Badge variant="outline">{trip.tripType.replace("_", " ")}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                if (confirm("Delete this trip? This action cannot be undone.")) {
                  deleteTripMutation.mutate();
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Days</h3>
              <p className="text-3xl font-display">{totalDays || "—"}</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Destinations</h3>
              <p className="text-3xl font-display">{trip.destinations.length}</p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Travelers</h3>
              <p className="text-3xl font-display">{trip.numTravelers}</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Estimated Budget</h3>
              <p className="text-2xl font-display">
                {trip.estimatedBudget ? `NPR ${Number(trip.estimatedBudget).toLocaleString()}` : "—"}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Planned Cost</h3>
              <p className="text-2xl font-display">NPR {totalPlannedCost.toLocaleString()}</p>
            </Card>
            <Card className={`p-6 ${budgetRemaining < 0 ? "bg-destructive/5 border-destructive/20" : "bg-success/5 border-success/20"}`}>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Budget Remaining</h3>
              <p className={`text-2xl font-display ${budgetRemaining < 0 ? "text-destructive" : "text-success"}`}>
                NPR {Math.abs(budgetRemaining).toLocaleString()}
                {budgetRemaining < 0 && " over"}
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-display text-xl mb-4">Trip Details</h3>
            <div className="space-y-4">
              {trip.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{trip.description}</p>
                </div>
              )}
              {trip.startDate && trip.endDate && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Dates
                  </h4>
                  <p className="text-sm">
                    {new Date(trip.startDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(trip.endDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {trip.emergencyContact && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Emergency Contact
                  </h4>
                  <p className="text-sm">{trip.emergencyContact}</p>
                </div>
              )}
              {trip.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notes
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{trip.notes}</p>
                </div>
              )}
            </div>
          </Card>

          {trip.places.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-xl mb-4">Favorite Places</h3>
              <div className="space-y-3">
                {trip.places.map(({ tripPlace, place }) => (
                  <div key={tripPlace.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">
                        <Link to={`/place/${place.slug}`} className="hover:text-primary">
                          {place.title}
                        </Link>
                      </h4>
                      {tripPlace.visitDate && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Visit: {new Date(tripPlace.visitDate).toLocaleDateString()}
                        </p>
                      )}
                      {tripPlace.notes && <p className="text-sm text-muted-foreground">{tripPlace.notes}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 hover:text-destructive"
                      onClick={() => removePlaceMutation.mutate(tripPlace.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {trip.importantDocuments.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-xl mb-4">Important Documents</h3>
              <div className="space-y-2">
                {trip.importantDocuments.map((doc, i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <h4 className="font-medium">{doc.name}</h4>
                    {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="itinerary" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl mb-1">Day-by-Day Itinerary</h2>
              <p className="text-sm text-muted-foreground">Plan activities, meals, and accommodations</p>
            </div>
            {trip.startDate && trip.endDate && (!days || days.length === 0) && (
              <Button onClick={handleGenerateDays} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Generate {totalDays} Days
              </Button>
            )}
          </div>

          {!days || days.length === 0 ? (
            <Card className="p-12 text-center">
              <Map className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-display text-xl mb-2">No days planned yet</h3>
              <p className="text-muted-foreground mb-6">
                {trip.startDate && trip.endDate
                  ? "Generate days from your trip dates or add them manually"
                  : "Set trip dates first, then generate your itinerary"}
              </p>
              <div className="flex gap-3 justify-center">
                {trip.startDate && trip.endDate && (
                  <Button onClick={handleGenerateDays} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Generate {totalDays} Days
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => createDayMutation.mutate((days?.length || 0) + 1)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Day Manually
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {days
                  .sort((a, b) => a.dayNumber - b.dayNumber)
                  .map((day) => (
                    <DayCard key={day.id} tripId={id!} day={day} />
                  ))}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => createDayMutation.mutate((days?.length || 0) + 1)}
              >
                <Plus className="w-4 h-4" />
                Add Another Day
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="budget">
          <BudgetDashboard tripId={id!} />
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistTab tripId={id!} />
        </TabsContent>
      </Tabs>

      <TripFormDialog open={editOpen} onOpenChange={setEditOpen} trip={trip} />
    </div>
  );
}

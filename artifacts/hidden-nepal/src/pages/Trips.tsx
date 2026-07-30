import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/store/useAuth";
import { trips, type ApiTrip, type TripStatus, type TripType } from "@/lib/api";
import { TripFormDialog } from "@/components/trips/TripFormDialog";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Mountain,
  Compass,
  Users as Family,
  User,
  Car,
  Camera,
  Sparkles,
  Map,
  Church,
  Bird,
} from "lucide-react";

const tripTypeIcons: Record<TripType, any> = {
  trekking: Mountain,
  adventure: Compass,
  cultural: Sparkles,
  family: Family,
  solo: User,
  road_trip: Car,
  wildlife: Bird,
  pilgrimage: Church,
  photography: Camera,
  other: Map,
};

const statusColors: Record<TripStatus, string> = {
  planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ongoing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function Trips() {
  const user = useAuth((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: tripsList, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => trips.list(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-4xl mb-4">Trip Planner</h1>
        <p className="text-muted-foreground mb-6">Sign in to start planning your Nepal adventures</p>
        <Button asChild>
          <Link to="/auth">Sign In</Link>
        </Button>
      </div>
    );
  }

  const filteredTrips = tripsList?.filter((trip) => {
    if (statusFilter !== "all" && trip.status !== statusFilter) return false;
    if (typeFilter !== "all" && trip.tripType !== typeFilter) return false;
    return true;
  });

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-2">My Trips</h1>
          <p className="text-muted-foreground">Plan and manage your Nepal adventures</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          New Trip
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="trekking">Trekking</SelectItem>
            <SelectItem value="adventure">Adventure</SelectItem>
            <SelectItem value="cultural">Cultural</SelectItem>
            <SelectItem value="family">Family</SelectItem>
            <SelectItem value="solo">Solo</SelectItem>
            <SelectItem value="road_trip">Road Trip</SelectItem>
            <SelectItem value="wildlife">Wildlife</SelectItem>
            <SelectItem value="pilgrimage">Pilgrimage</SelectItem>
            <SelectItem value="photography">Photography</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : !filteredTrips || filteredTrips.length === 0 ? (
        <Card className="p-12 text-center">
          <Mountain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-display text-xl mb-2">
            {statusFilter === "all" && typeFilter === "all" ? "No trips yet" : "No trips match your filters"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {statusFilter === "all" && typeFilter === "all"
              ? "Start planning your first adventure in Nepal"
              : "Try adjusting your filters"}
          </p>
          {statusFilter === "all" && typeFilter === "all" && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Trip
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => {
            const TypeIcon = trip.tripType ? tripTypeIcons[trip.tripType] : Map;
            return (
              <Link key={trip.id} to={`/trips/${trip.id}`}>
                <Card className="p-5 hover-lift cursor-pointer transition-all h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-display text-xl mb-2 line-clamp-1">{trip.title}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={statusColors[trip.status]}>{trip.status}</Badge>
                        {trip.tripType && (
                          <Badge variant="outline" className="gap-1">
                            <TypeIcon className="w-3 h-3" />
                            {trip.tripType.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {trip.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{trip.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    {trip.startDate && trip.endDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(trip.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          -{" "}
                          {new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )}
                    {trip.destinations.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{trip.destinations.join(", ")}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{trip.numTravelers} traveler{trip.numTravelers !== 1 ? "s" : ""}</span>
                    </div>
                    {trip.estimatedBudget && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wallet className="w-4 h-4" />
                        <span>NPR {Number(trip.estimatedBudget).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {trip.placeCount !== undefined && trip.placeCount > 0 && (
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      {trip.placeCount} place{trip.placeCount !== 1 ? "s" : ""} added
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <TripFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { trips, type ApiTripDay, type ActivityCategory } from "@/lib/api";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Coffee,
  Sunrise,
  UtensilsCrossed,
  Sun,
  Cookie,
  Moon,
  Bed,
  Truck,
  MoreHorizontal,
  X,
  Clock,
  MapPin,
  Wallet,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const categoryIcons: Record<ActivityCategory, any> = {
  breakfast: Coffee,
  morning_activity: Sunrise,
  lunch: UtensilsCrossed,
  afternoon_activity: Sun,
  snacks: Cookie,
  dinner: Moon,
  accommodation: Bed,
  transportation: Truck,
  miscellaneous: MoreHorizontal,
};

const categoryOrder: ActivityCategory[] = [
  "breakfast",
  "morning_activity",
  "lunch",
  "afternoon_activity",
  "snacks",
  "dinner",
  "accommodation",
  "transportation",
  "miscellaneous",
];

interface DayCardProps {
  tripId: string;
  day: ApiTripDay;
}

export function DayCard({ tripId, day }: DayCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [editingDay, setEditingDay] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);

  const [dayDate, setDayDate] = useState(day.date || "");
  const [wakeUpTime, setWakeUpTime] = useState(day.wakeUpTime || "");

  const [actCategory, setActCategory] = useState<ActivityCategory>("breakfast");
  const [actTime, setActTime] = useState("");
  const [actDescription, setActDescription] = useState("");
  const [actLocation, setActLocation] = useState("");
  const [actCost, setActCost] = useState("");

  const updateDayMutation = useMutation({
    mutationFn: (data: any) => trips.updateDay(tripId, day.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-days", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-budget", tripId] });
      setEditingDay(false);
      toast({ title: "Day updated" });
    },
  });

  const deleteDayMutation = useMutation({
    mutationFn: () => trips.deleteDay(tripId, day.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-days", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-budget", tripId] });
      toast({ title: "Day deleted" });
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data: any) => trips.createActivity(tripId, day.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-days", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-budget", tripId] });
      setAddingActivity(false);
      resetActivityForm();
      toast({ title: "Activity added" });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: any) => trips.updateActivity(tripId, day.id, activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-days", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-budget", tripId] });
      setEditingActivity(null);
      toast({ title: "Activity updated" });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: string) => trips.deleteActivity(tripId, day.id, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-days", tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-budget", tripId] });
      toast({ title: "Activity deleted" });
    },
  });

  const resetActivityForm = () => {
    setActCategory("breakfast");
    setActTime("");
    setActDescription("");
    setActLocation("");
    setActCost("");
  };

  const handleUpdateDay = () => {
    updateDayMutation.mutate({
      date: dayDate || null,
      wakeUpTime: wakeUpTime || null,
    });
  };

  const handleAddActivity = () => {
    if (!actDescription.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    createActivityMutation.mutate({
      category: actCategory,
      time: actTime || undefined,
      description: actDescription.trim(),
      location: actLocation.trim() || undefined,
      cost: actCost || undefined,
    });
  };

  const sortedActivities = [...day.activities].sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a.category);
    const bIdx = categoryOrder.indexOf(b.category);
    return aIdx - bIdx;
  });

  const dailyTotal = day.activities.reduce((sum, act) => sum + (act.cost ? Number(act.cost) : 0), 0);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4 bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <div>
              <h3 className="font-display text-lg">
                Day {day.dayNumber}
                {day.date && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </h3>
              {day.wakeUpTime && <p className="text-xs text-muted-foreground">Wake up: {day.wakeUpTime}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dailyTotal > 0 && (
              <span className="text-sm font-medium px-2 py-1 bg-background rounded">
                NPR {dailyTotal.toLocaleString()}
              </span>
            )}
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setEditingDay(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 hover:text-destructive"
              onClick={() => {
                if (confirm("Delete this day?")) deleteDayMutation.mutate();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="p-4 space-y-2">
            {sortedActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activities yet</p>
            ) : (
              sortedActivities.map((activity) => {
                const Icon = categoryIcons[activity.category];
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {activity.category.replace("_", " ")}
                        </span>
                        {activity.time && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.time}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">{activity.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {activity.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {activity.location}
                          </span>
                        )}
                        {activity.cost && (
                          <span className="flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            NPR {Number(activity.cost).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 shrink-0 hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this activity?")) deleteActivityMutation.mutate(activity.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })
            )}

            <Button variant="outline" className="w-full gap-2" onClick={() => setAddingActivity(true)}>
              <Plus className="w-4 h-4" />
              Add Activity
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={editingDay} onOpenChange={setEditingDay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Day {day.dayNumber}</DialogTitle>
            <DialogDescription>Update day details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Wake-up Time</Label>
              <Input
                type="time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                placeholder="06:00"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateDay} disabled={updateDayMutation.isPending} className="flex-1">
                {updateDayMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditingDay(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addingActivity} onOpenChange={(open) => {
        setAddingActivity(open);
        if (!open) resetActivityForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>Add a new activity to Day {day.dayNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={actCategory} onValueChange={(v) => setActCategory(v as ActivityCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="morning_activity">Morning Activity</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="afternoon_activity">Afternoon Activity</SelectItem>
                  <SelectItem value="snacks">Snacks/Tea Break</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={actTime} onChange={(e) => setActTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={actDescription}
                onChange={(e) => setActDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={actLocation} onChange={(e) => setActLocation(e.target.value)} placeholder="Place name" />
            </div>
            <div className="space-y-2">
              <Label>Cost (NPR)</Label>
              <Input type="number" min="0" value={actCost} onChange={(e) => setActCost(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddActivity} disabled={createActivityMutation.isPending} className="flex-1">
                {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
              </Button>
              <Button variant="outline" onClick={() => setAddingActivity(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { trips, type ApiChecklist } from "@/lib/api";
import { Plus, Trash2, ListChecks, Sparkles } from "lucide-react";

interface ChecklistTabProps {
  tripId: string;
}

const defaultNepalTrekChecklist = [
  { category: "Documents", item: "Passport (valid 6+ months)" },
  { category: "Documents", item: "Nepal visa / entry permit" },
  { category: "Documents", item: "Travel insurance documents" },
  { category: "Documents", item: "Trekking permits (TIMS, ACAP, etc.)" },
  { category: "Documents", item: "Emergency contact list" },
  { category: "Clothing", item: "Base layer thermal tops" },
  { category: "Clothing", item: "Fleece or down jacket" },
  { category: "Clothing", item: "Waterproof shell jacket" },
  { category: "Clothing", item: "Trekking pants" },
  { category: "Clothing", item: "Warm hat and sun hat" },
  { category: "Clothing", item: "Hiking boots (broken in)" },
  { category: "Gear", item: "Backpack (40-50L)" },
  { category: "Gear", item: "Sleeping bag (appropriate rating)" },
  { category: "Gear", item: "Trekking poles" },
  { category: "Gear", item: "Headlamp with extra batteries" },
  { category: "Gear", item: "Water bottles / hydration system" },
  { category: "Gear", item: "Sunglasses (UV protection)" },
  { category: "Medical", item: "First aid kit" },
  { category: "Medical", item: "Altitude sickness medication" },
  { category: "Medical", item: "Personal prescription medications" },
  { category: "Medical", item: "Sunscreen (SPF 50+)" },
  { category: "Medical", item: "Lip balm with SPF" },
  { category: "Money", item: "Cash (NPR + USD)" },
  { category: "Money", item: "Credit/debit cards" },
  { category: "Miscellaneous", item: "Phone + charger" },
  { category: "Miscellaneous", item: "Power bank" },
  { category: "Miscellaneous", item: "Camera" },
  { category: "Miscellaneous", item: "Toiletries" },
];

export function ChecklistTab({ tripId }: ChecklistTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "packed" | "unpacked">("all");
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const { data: checklist, isLoading } = useQuery({
    queryKey: ["trip-checklist", tripId],
    queryFn: () => trips.getChecklist(tripId),
  });

  const createItemMutation = useMutation({
    mutationFn: (data: { item: string; category?: string }) => trips.createChecklistItem(tripId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
      setNewItem("");
      setNewCategory("");
      toast({ title: "Item added" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => trips.updateChecklistItem(tripId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => trips.deleteChecklistItem(tripId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
      toast({ title: "Item deleted" });
    },
  });

  const seedChecklistMutation = useMutation({
    mutationFn: () => trips.bulkReplaceChecklist(tripId, defaultNepalTrekChecklist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-checklist", tripId] });
      toast({ title: "Default packing list loaded" });
    },
  });

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    createItemMutation.mutate({
      item: newItem.trim(),
      category: newCategory.trim() || undefined,
    });
  };

  const handleToggleItem = (item: ApiChecklist) => {
    updateItemMutation.mutate({
      id: item.id,
      data: { isChecked: !item.isChecked },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-3/4" />
          </Card>
        ))}
      </div>
    );
  }

  if (!checklist) return null;

  const filteredItems = checklist.filter((item) => {
    if (filter === "packed") return item.isChecked;
    if (filter === "unpacked") return !item.isChecked;
    return true;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || "Miscellaneous";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ApiChecklist[]>);

  const checkedCount = checklist.filter((i) => i.isChecked).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {totalCount === 0 ? (
        <Card className="p-12 text-center">
          <ListChecks className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-display text-xl mb-2">No checklist items yet</h3>
          <p className="text-muted-foreground mb-6">Start with a pre-made packing list or create your own</p>
          <Button onClick={() => seedChecklistMutation.mutate()} disabled={seedChecklistMutation.isPending} className="gap-2">
            <Sparkles className="w-4 h-4" />
            {seedChecklistMutation.isPending ? "Loading..." : "Load Default Nepal Trek List"}
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl mb-1">Packing Checklist</h3>
              <p className="text-sm text-muted-foreground">
                {checkedCount} of {totalCount} items packed ({progress}%)
              </p>
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="packed">Packed</SelectItem>
                <SelectItem value="unpacked">Unpacked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-saffron to-accent transition-all rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-6">
            {Object.entries(groupedItems)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, items]) => (
                <div key={category}>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Card
                        key={item.id}
                        className={`p-4 flex items-center gap-3 transition-all ${
                          item.isChecked ? "bg-muted/50" : ""
                        }`}
                      >
                        <Checkbox
                          checked={item.isChecked}
                          onCheckedChange={() => handleToggleItem(item)}
                          id={`item-${item.id}`}
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className={`flex-1 cursor-pointer select-none ${
                            item.isChecked ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {item.item}
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 hover:text-destructive shrink-0"
                          onClick={() => {
                            if (confirm("Delete this item?")) deleteItemMutation.mutate(item.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      <Card className="p-4">
        <Label className="text-sm font-medium mb-3 block">Add New Item</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Item name"
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            className="flex-1"
          />
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="w-40"
          />
          <Button onClick={handleAddItem} disabled={createItemMutation.isPending} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

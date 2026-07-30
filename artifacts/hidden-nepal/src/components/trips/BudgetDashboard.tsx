import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trips, type ApiBudgetSummary } from "@/lib/api";
import { Wallet, TrendingDown, TrendingUp, Coffee, Bed, Truck, Sun, MoreHorizontal } from "lucide-react";

interface BudgetDashboardProps {
  tripId: string;
}

export function BudgetDashboard({ tripId }: BudgetDashboardProps) {
  const { data: budget, isLoading } = useQuery({
    queryKey: ["trip-budget", tripId],
    queryFn: () => trips.getBudget(tripId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-24" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-24" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-24" />
          </Card>
        </div>
      </div>
    );
  }

  if (!budget) return null;

  const budgetRemaining = budget.budgetRemaining;
  const percentUsed = budget.estimatedBudget > 0 ? (budget.totalPlannedCost / budget.estimatedBudget) * 100 : 0;
  const isOverBudget = budgetRemaining < 0;
  const isNearLimit = percentUsed > 80 && !isOverBudget;

  const categoryData = [
    { label: "Accommodation", value: budget.categoryTotals.accommodation, icon: Bed, color: "hsl(var(--primary))" },
    { label: "Food", value: budget.categoryTotals.food, icon: Coffee, color: "hsl(var(--saffron))" },
    { label: "Transportation", value: budget.categoryTotals.transportation, icon: Truck, color: "hsl(var(--accent))" },
    { label: "Activities", value: budget.categoryTotals.activities, icon: Sun, color: "hsl(var(--forest))" },
    { label: "Miscellaneous", value: budget.categoryTotals.miscellaneous, icon: MoreHorizontal, color: "hsl(var(--muted-foreground))" },
  ];

  const maxCategoryValue = Math.max(...categoryData.map((c) => c.value), 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-muted-foreground">Estimated Budget</h3>
          </div>
          <p className="text-3xl font-display">NPR {budget.estimatedBudget.toLocaleString()}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-muted-foreground">Total Planned Cost</h3>
          </div>
          <p className="text-3xl font-display">NPR {budget.totalPlannedCost.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">{percentUsed.toFixed(1)}% of budget</p>
        </Card>

        <Card
          className={`p-6 ${
            isOverBudget
              ? "bg-destructive/5 border-destructive/20"
              : isNearLimit
              ? "bg-warning/5 border-warning/20"
              : "bg-success/5 border-success/20"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isOverBudget
                  ? "bg-destructive/10 text-destructive"
                  : isNearLimit
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
              }`}
            >
              {isOverBudget ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <h3 className="font-medium text-muted-foreground">Budget Remaining</h3>
          </div>
          <p
            className={`text-3xl font-display ${
              isOverBudget ? "text-destructive" : isNearLimit ? "text-warning" : "text-success"
            }`}
          >
            NPR {Math.abs(budgetRemaining).toLocaleString()}
            {isOverBudget && " over"}
          </p>
          {isOverBudget && <p className="text-sm text-destructive mt-1">You've exceeded your budget</p>}
          {isNearLimit && <p className="text-sm text-warning mt-1">Approaching budget limit</p>}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-display text-xl mb-6">Category Breakdown</h3>
        <div className="space-y-4">
          {categoryData.map((cat) => {
            const Icon = cat.icon;
            const percentage = maxCategoryValue > 0 ? (cat.value / maxCategoryValue) * 100 : 0;
            return (
              <div key={cat.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: cat.color }} />
                    <span className="font-medium">{cat.label}</span>
                  </div>
                  <span className="text-muted-foreground">NPR {cat.value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {Object.keys(budget.dayTotals).length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-xl mb-4">Day-by-Day Cost</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Day</th>
                  <th className="text-right py-2 font-medium">Cost (NPR)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(budget.dayTotals)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([dayNum, cost]) => (
                    <tr key={dayNum} className="border-b last:border-0">
                      <td className="py-2">Day {dayNum}</td>
                      <td className="text-right py-2">{cost.toLocaleString()}</td>
                    </tr>
                  ))}
                <tr className="font-bold">
                  <td className="py-2 pt-4">Total</td>
                  <td className="text-right py-2 pt-4">{budget.totalPlannedCost.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

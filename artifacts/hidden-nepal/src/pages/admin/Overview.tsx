import { useQuery } from "@tanstack/react-query";
import { admin } from "@/lib/api";
import { Users, MapPin, Inbox, Eye, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Overview = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => admin.stats(),
  });
  const { data: subs = [] } = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: () => admin.submissions(),
  });

  const recentSubs = subs.slice(0, 5);

  if (isLoading) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Dashboard</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">A snapshot of the atlas.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Stat icon={<MapPin className="h-4 w-4" />} label="Approved places" value={stats?.approvedPlaces ?? 0} accent />
        <Stat icon={<Inbox className="h-4 w-4" />} label="Pending review" value={stats?.pendingSubmissions ?? 0} highlight={(stats?.pendingSubmissions ?? 0) > 0} />
        <Stat icon={<Users className="h-4 w-4" />} label="Users" value={stats?.totalUsers ?? 0} />
        <Stat icon={<Eye className="h-4 w-4" />} label="Open reports" value={stats?.openReports ?? 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Top contributors
            </h2>
            <Link to="/admin/places" className="text-sm text-primary hover:underline">View places</Link>
          </div>
          <ul className="divide-y divide-border">
            {(stats?.topContributors ?? []).map((c, i) => (
              <li key={i} className="p-4 flex items-center gap-4">
                <span className="font-display text-2xl text-muted-foreground w-6 text-center">{i + 1}</span>
                <div className="h-10 w-10 rounded-full bg-gradient-sunset text-accent-foreground grid place-items-center font-semibold text-sm">
                  {c.name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.name}</div>
                </div>
                <div className="text-sm font-medium tabular-nums">{c.count} <span className="text-muted-foreground font-normal">places</span></div>
              </li>
            ))}
            {(stats?.topContributors ?? []).length === 0 && (
              <li className="p-8 text-center text-muted-foreground text-sm">No contributions yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-lg font-semibold">Recent submissions</h2>
          </div>
          <ul className="divide-y divide-border">
            {recentSubs.map((s, i) => (
              <li key={i} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-lg">🏔</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.place.title}</div>
                  <div className="text-xs text-muted-foreground">{s.submitter.name}</div>
                </div>
                <Badge variant={s.submission.status === "approved" ? "default" : s.submission.status === "rejected" ? "destructive" : "secondary"} className="capitalize text-xs">
                  {s.submission.status}
                </Badge>
              </li>
            ))}
            {recentSubs.length === 0 && (
              <li className="p-8 text-center text-muted-foreground text-sm">No submissions yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value, accent, highlight }: { icon: React.ReactNode; label: string; value: number | string; accent?: boolean; highlight?: boolean }) => (
  <div className={`rounded-xl border p-5 ${highlight ? "border-accent bg-accent-soft" : accent ? "border-border bg-gradient-warm" : "border-border bg-card"}`}>
    <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-1.5">{icon} {label}</div>
    <div className="font-display text-3xl font-semibold mt-2 tabular-nums">{value}</div>
  </div>
);

export default Overview;

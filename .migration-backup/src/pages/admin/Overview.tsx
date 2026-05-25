import { useApp } from "@/store/useApp";
import { Users, MapPin, Inbox, Eye, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Overview = () => {
  const { places, submissions, users } = useApp();
  const approved = places.filter((p) => p.status === "approved");
  const pending = submissions.filter((s) => s.status === "pending");
  const totalViews = approved.reduce((sum, p) => sum + p.views, 0);
  const topPlaces = [...approved].sort((a, b) => b.views - a.views).slice(0, 5);

  const recentActivity = [
    ...submissions.slice(0, 5).map((s) => ({
      type: s.status,
      placeId: s.placeId,
      date: s.submittedAt,
    })),
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Dashboard</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">A snapshot of the atlas.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Stat icon={<MapPin className="h-4 w-4" />} label="Approved places" value={approved.length} accent />
        <Stat icon={<Inbox className="h-4 w-4" />} label="Pending review" value={pending.length} highlight={pending.length > 0} />
        <Stat icon={<Users className="h-4 w-4" />} label="Users" value={users.length} />
        <Stat icon={<Eye className="h-4 w-4" />} label="Total views" value={totalViews.toLocaleString()} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Most viewed places
            </h2>
            <Link to="/admin/places" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-border">
            {topPlaces.map((p, i) => (
              <li key={p.id} className="p-4 flex items-center gap-4">
                <span className="font-display text-2xl text-muted-foreground w-6 text-center">{i + 1}</span>
                <img src={p.coverImage} alt={p.title} className="h-12 w-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <Link to={`/place/${p.slug}`} className="font-medium hover:text-primary block truncate">{p.title}</Link>
                  <div className="text-xs text-muted-foreground">{p.district}, {p.province}</div>
                </div>
                <div className="text-sm font-medium tabular-nums">{p.views.toLocaleString()} <span className="text-muted-foreground font-normal">views</span></div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-lg font-semibold">Recent submissions</h2>
          </div>
          <ul className="divide-y divide-border">
            {recentActivity.map((a, i) => {
              const place = places.find((p) => p.id === a.placeId);
              if (!place) return null;
              return (
                <li key={i} className="p-4 flex items-center gap-3">
                  <img src={place.coverImage} alt="" className="h-10 w-10 rounded-md object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{place.title}</div>
                    <div className="text-xs text-muted-foreground">{a.date}</div>
                  </div>
                  <Badge variant={a.type === "approved" ? "default" : a.type === "rejected" ? "destructive" : "secondary"} className="capitalize text-xs">
                    {a.type}
                  </Badge>
                </li>
              );
            })}
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

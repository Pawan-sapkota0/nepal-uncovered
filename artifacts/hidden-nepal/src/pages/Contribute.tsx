import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/useAuth";
import { useQuery } from "@tanstack/react-query";
import { me, type ApiSubmission } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Award, CheckCircle2, Clock, XCircle, Loader2,
  AlertCircle, MapPin, CalendarDays, MessageSquare, ExternalLink, Mountain,
} from "lucide-react";
import { useEffect } from "react";

// ─── status config ────────────────────────────────────────────────────────────
type SubStatus = "pending" | "approved" | "rejected" | "changes_requested";

const STATUS: Record<SubStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  approved: {
    label: "Approved", color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  pending: {
    label: "Under review", color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Not approved", color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  changes_requested: {
    label: "Changes needed", color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

// ─── main page ────────────────────────────────────────────────────────────────
const Contribute = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = (params.get("status") ?? "all") as SubStatus | "all";

  useEffect(() => { if (!currentUser) navigate("/auth"); }, [currentUser, navigate]);

  const { data: mySubs = [], isLoading } = useQuery({
    queryKey: ["me", "submissions"],
    queryFn: () => me.submissions(),
    enabled: !!currentUser,
  });

  if (!currentUser) return null;

  const counts = {
    all: mySubs.length,
    approved: mySubs.filter((s) => s.status === "approved").length,
    pending: mySubs.filter((s) => s.status === "pending").length,
    rejected: mySubs.filter((s) => s.status === "rejected").length,
    changes_requested: mySubs.filter((s) => s.status === "changes_requested").length,
  };

  const visible = filter === "all" ? mySubs : mySubs.filter((s) => s.status === filter);

  const setFilter = (v: string) => {
    if (v === "all") params.delete("status"); else params.set("status", v);
    setParams(params, { replace: true });
  };

  return (
    <div className="pt-28 pb-20">
      <div className="container max-w-5xl">

        {/* ── header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">
              Contributor dashboard
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
              Hello, {currentUser.name.split(" ")[0]}
            </h1>
            <p className="mt-2 text-muted-foreground text-lg">
              Track your submissions and add new places to the atlas.
            </p>
          </div>
          <Button variant="hero" size="lg" onClick={() => navigate("/contribute/new")}>
            <Plus className="h-4 w-4" /> Add a place
          </Button>
        </div>

        {/* ── stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Award className="h-4 w-4 text-muted-foreground" />}
            label="Total" value={counts.all}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Live" value={counts.approved}
            accent="emerald"
          />
          <StatCard
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            label="Pending" value={counts.pending}
            accent="amber"
          />
          <StatCard
            icon={<AlertCircle className="h-4 w-4 text-orange-600" />}
            label="Needs edits" value={counts.changes_requested + counts.rejected}
            accent="orange"
          />
        </div>

        {/* ── filter tabs ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {([
            ["all", "All"],
            ["approved", "Live"],
            ["pending", "Under review"],
            ["changes_requested", "Needs edits"],
            ["rejected", "Not approved"],
          ] as const).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === val
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
            >
              {lbl}
              {(counts as Record<string, number>)[val] > 0 && (
                <span className={`ml-2 text-xs font-semibold ${filter === val ? "opacity-70" : "text-muted-foreground"}`}>
                  {(counts as Record<string, number>)[val]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── submission list ── */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState filter={filter} onAdd={() => navigate("/contribute/new")} />
          ) : (
            visible.map((sub) => <SubmissionCard key={sub.id} sub={sub} />)
          )}
        </div>
      </div>
    </div>
  );
};

// ─── submission card ──────────────────────────────────────────────────────────
const SubmissionCard = ({ sub }: { sub: ApiSubmission }) => {
  const status = (sub.status as SubStatus) in STATUS ? sub.status as SubStatus : "pending";
  const cfg = STATUS[status];
  const isApproved = status === "approved";
  const hasFeedback = !!sub.feedback;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex gap-0">
        {/* cover image */}
        <Link
          to={isApproved ? `/place/${sub.place.slug}` : "#"}
          className={`shrink-0 w-32 md:w-44 relative overflow-hidden bg-muted ${!isApproved ? "pointer-events-none" : ""}`}
        >
          {sub.place.coverImage ? (
            <img
              src={sub.place.coverImage}
              alt={sub.place.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-4xl text-muted-foreground/30">
              <Mountain className="h-12 w-12" />
            </div>
          )}
        </Link>

        {/* content */}
        <div className="flex-1 min-w-0 p-5">
          {/* title + badge row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              {isApproved ? (
                <Link
                  to={`/place/${sub.place.slug}`}
                  className="font-display font-semibold text-lg hover:text-primary transition-colors leading-tight block"
                >
                  {sub.place.title}
                </Link>
              ) : (
                <p className="font-display font-semibold text-lg leading-tight">{sub.place.title}</p>
              )}
            </div>
            <StatusPill status={status} />
          </div>

          {/* meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {sub.place.district}
              {sub.place.province && `, ${sub.place.province}`}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Submitted {new Date(sub.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
            {sub.reviewedAt && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Reviewed {new Date(sub.reviewedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {/* short description */}
          {sub.place.shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{sub.place.shortDescription}</p>
          )}

          {/* feedback panel */}
          {hasFeedback && (
            <div className={`rounded-xl border px-4 py-3 mb-3 ${cfg.bg} ${cfg.border}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 inline-flex items-center gap-1.5 ${cfg.color}`}>
                {cfg.icon} Reviewer feedback
              </p>
              <p className="text-sm text-foreground leading-relaxed">{sub.feedback}</p>
            </div>
          )}

          {/* actions */}
          <div className="flex gap-2 flex-wrap">
            {isApproved && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/place/${sub.place.slug}`}>
                  <ExternalLink className="h-3.5 w-3.5" /> View live
                </Link>
              </Button>
            )}
            {(status === "rejected" || status === "changes_requested") && (
              <Button variant="hero" size="sm" asChild>
                <Link to="/contribute/new">
                  <Plus className="h-3.5 w-3.5" /> Submit updated version
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── status pill ─────────────────────────────────────────────────────────────
const StatusPill = ({ status }: { status: SubStatus }) => {
  const cfg = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: number; accent?: "emerald" | "amber" | "orange";
}) => {
  const ring = accent === "emerald" ? "group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800"
    : accent === "amber" ? "group-hover:ring-amber-200 dark:group-hover:ring-amber-800"
    : accent === "orange" ? "group-hover:ring-orange-200 dark:group-hover:ring-orange-800"
    : "group-hover:ring-border";
  return (
    <div className={`group rounded-xl border border-border bg-card p-5 ring-2 ring-transparent transition-all ${ring}`}>
      <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="font-display text-3xl font-semibold mt-2">{value}</div>
    </div>
  );
};

// ─── empty state ─────────────────────────────────────────────────────────────
const EmptyState = ({ filter, onAdd }: { filter: string; onAdd: () => void }) => (
  <div className="rounded-2xl border border-border bg-card p-16 text-center">
    <Mountain className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
    {filter === "all" ? (
      <>
        <p className="text-muted-foreground mb-4 text-lg">You haven't shared a place yet.</p>
        <Button variant="hero" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add your first place
        </Button>
      </>
    ) : (
      <p className="text-muted-foreground">No submissions with this status.</p>
    )}
  </div>
);

export default Contribute;

import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/store/useApp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Award, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const Contribute = () => {
  const { currentUser, places, submissions, deletePlace } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate("/auth");
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const mySubs = submissions
    .filter((s) => s.userId === currentUser.id)
    .map((s) => ({ submission: s, place: places.find((p) => p.id === s.placeId) }))
    .filter((x) => x.place);

  const stats = {
    total: mySubs.length,
    approved: mySubs.filter((m) => m.submission.status === "approved").length,
    pending: mySubs.filter((m) => m.submission.status === "pending").length,
    rejected: mySubs.filter((m) => m.submission.status === "rejected").length,
  };

  return (
    <div className="pt-28 pb-20">
      <div className="container max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3">Contributor</div>
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Stat icon={<Award className="h-4 w-4" />} label="Total" value={stats.total} />
          <Stat icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Approved" value={stats.approved} />
          <Stat icon={<Clock className="h-4 w-4 text-warning" />} label="Pending" value={stats.pending} />
          <Stat icon={<XCircle className="h-4 w-4 text-destructive" />} label="Rejected" value={stats.rejected} />
        </div>

        {/* Submissions list */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">My submissions</h2>
            <span className="text-sm text-muted-foreground">{mySubs.length} total</span>
          </div>
          {mySubs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't shared a place yet.</p>
              <Button variant="hero" onClick={() => navigate("/contribute/new")}>
                <Plus className="h-4 w-4" /> Add your first place
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {mySubs.map(({ submission, place }) => place && (
                <li key={submission.id} className="p-5 flex items-center gap-4 hover:bg-muted/50 transition">
                  <Link to={`/place/${place.slug}`} className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img src={place.coverImage} alt={place.title} className="h-full w-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/place/${place.slug}`} className="font-display font-semibold hover:text-primary block truncate">
                      {place.title}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {place.district} · Submitted {submission.submittedAt}
                    </div>
                    {submission.feedback && (
                      <div className="text-xs mt-1 text-destructive">Feedback: {submission.feedback}</div>
                    )}
                  </div>
                  <StatusBadge status={submission.status} />
                  {submission.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        deletePlace(place.id);
                        toast.success("Submission withdrawn");
                      }}
                      aria-label="Withdraw submission"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-1.5">
      {icon} {label}
    </div>
    <div className="font-display text-3xl font-semibold mt-2">{value}</div>
  </div>
);

const StatusBadge = ({ status }: { status: "pending" | "approved" | "rejected" }) => {
  if (status === "approved") return <Badge className="bg-success text-success-foreground border-0">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-destructive text-destructive-foreground border-0">Rejected</Badge>;
  return <Badge className="bg-warning text-warning-foreground border-0">Pending</Badge>;
};

export default Contribute;

import { useState } from "react";
import { useApp } from "@/store/useApp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, MapPin, ExternalLink, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Submissions = () => {
  const { submissions, places, users, reviewSubmission } = useApp();
  const [feedback, setFeedback] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  const enrich = (status: "pending" | "approved" | "rejected") =>
    submissions
      .filter((s) => s.status === status)
      .map((s) => ({
        sub: s,
        place: places.find((p) => p.id === s.placeId),
        user: users.find((u) => u.id === s.userId),
      }))
      .filter((x) => x.place);

  const handleApprove = (placeId: string) => {
    reviewSubmission(placeId, "approve");
    toast.success("Submission approved and published");
  };
  const handleReject = () => {
    if (!rejectId) return;
    reviewSubmission(rejectId, "reject", feedback);
    toast.success("Submission rejected with feedback");
    setRejectId(null);
    setFeedback("");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Moderation</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Submissions</h1>
      <p className="text-muted-foreground mt-1">Review, approve or reject community contributions.</p>

      <Tabs defaultValue="pending" className="mt-8">
        <TabsList>
          <TabsTrigger value="pending">Pending ({enrich("pending").length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({enrich("approved").length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({enrich("rejected").length})</TabsTrigger>
        </TabsList>

        {(["pending", "approved", "rejected"] as const).map((status) => {
          const items = enrich(status);
          return (
            <TabsContent key={status} value={status} className="mt-6">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  No {status} submissions.
                </div>
              ) : (
                <div className="grid gap-4">
                  {items.map(({ sub, place, user }) => place && (
                    <div key={sub.id} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col md:flex-row">
                      <div className="md:w-56 h-44 md:h-auto shrink-0 bg-muted">
                        <img src={place.coverImage} alt={place.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-display text-xl font-semibold">{place.title}</h3>
                            <div className="text-sm text-muted-foreground inline-flex items-center gap-2 mt-1">
                              <MapPin className="h-3 w-3" /> {place.district}, {place.province}
                              <span className="mx-1">·</span>
                              <Badge variant="secondary" className="capitalize">{place.category}</Badge>
                            </div>
                          </div>
                          <Link to={`/place/${place.slug}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            Preview <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        <p className="mt-3 text-sm text-foreground/80 line-clamp-2">{place.shortDescription}</p>
                        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                          <div className="text-xs text-muted-foreground">
                            Submitted by <span className="font-medium text-foreground">{user?.name ?? "Unknown"}</span> on {sub.submittedAt}
                          </div>
                          {status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => setRejectId(place.id)}>
                                <X className="h-4 w-4" /> Reject
                              </Button>
                              <Button variant="hero" size="sm" onClick={() => handleApprove(place.id)}>
                                <Check className="h-4 w-4" /> Approve & publish
                              </Button>
                            </div>
                          )}
                          {status === "approved" && (
                            <Badge className="bg-success text-success-foreground border-0 inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" /> Published
                            </Badge>
                          )}
                          {status === "rejected" && sub.feedback && (
                            <div className="text-xs text-destructive">Feedback: {sub.feedback}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!rejectId} onOpenChange={(v) => !v && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>Tell the contributor what to improve. They'll see this feedback in their dashboard.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="Reason for rejection…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject submission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submissions;

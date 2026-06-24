import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, MessageSquare, MapPin, ExternalLink, Loader2, ImageOff } from "lucide-react";
import { getImageUrl } from "@/lib/imageUrl";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  changes_requested: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

const Submissions = () => {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [changesId, setChangesId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: () => admin.submissions(),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => admin.approveSubmission(id),
    onSuccess: () => { toast.success("Submission approved and published"); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, fb }: { id: string; fb: string }) => admin.rejectSubmission(id, fb),
    onSuccess: () => { toast.success("Submission rejected"); qc.invalidateQueries({ queryKey: ["admin"] }); setRejectId(null); setFeedback(""); },
    onError: () => toast.error("Failed to reject"),
  });

  const changesMut = useMutation({
    mutationFn: ({ id, fb }: { id: string; fb: string }) => admin.requestChanges(id, fb),
    onSuccess: () => { toast.success("Changes requested"); qc.invalidateQueries({ queryKey: ["admin"] }); setChangesId(null); setFeedback(""); },
    onError: () => toast.error("Failed to request changes"),
  });

  const byStatus = (status: string) => data.filter((s) => s.submission.status === status);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Moderation</div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Submissions</h1>
      <p className="text-muted-foreground mt-1">Review, approve or reject community contributions.</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="pending" className="mt-8">
          <TabsList>
            <TabsTrigger value="pending">Pending ({byStatus("pending").length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({byStatus("approved").length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({byStatus("rejected").length})</TabsTrigger>
            <TabsTrigger value="changes_requested">Changes ({byStatus("changes_requested").length})</TabsTrigger>
          </TabsList>

          {["pending", "approved", "rejected", "changes_requested"].map((status) => {
            const items = byStatus(status);
            return (
              <TabsContent key={status} value={status} className="mt-6">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                    No {status.replace("_", " ")} submissions.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {items.map(({ submission: sub, place, submitter }) => (
                      <div key={sub.id} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col md:flex-row">
                        <div className="md:w-56 h-44 md:h-auto shrink-0 bg-muted overflow-hidden relative flex items-center justify-center">
                          {place.coverImage ? (
                            <img src={getImageUrl(place.coverImage)} alt={place.title} className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-display text-xl font-semibold">{place.title}</h3>
                              <div className="text-sm text-muted-foreground inline-flex items-center gap-2 mt-1">
                                <MapPin className="h-3 w-3" />
                                <Badge className={statusColor[sub.status] ?? ""}>{sub.status.replace("_", " ")}</Badge>
                              </div>
                            </div>
                            <Link to={`/place/${place.slug}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0">
                              Preview <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                            <div className="text-xs text-muted-foreground">
                              By <span className="font-medium text-foreground">{submitter.name}</span> ({submitter.email})
                              {" · "}{new Date(sub.submittedAt).toLocaleDateString()}
                            </div>
                            {status === "pending" && (
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => { setChangesId(sub.id); setFeedback(""); }}>
                                  <MessageSquare className="h-4 w-4" /> Changes
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { setRejectId(sub.id); setFeedback(""); }}>
                                  <X className="h-4 w-4" /> Reject
                                </Button>
                                <Button variant="hero" size="sm" onClick={() => approveMut.mutate(sub.id)} disabled={approveMut.isPending}>
                                  {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
                                </Button>
                              </div>
                            )}
                          </div>
                          {sub.feedback && (
                            <div className="mt-2 text-xs text-muted-foreground border-l-2 border-border pl-3 italic">Feedback: {sub.feedback}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Dialog open={!!rejectId} onOpenChange={(v) => !v && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject submission</DialogTitle><DialogDescription>Tell the contributor what to improve.</DialogDescription></DialogHeader>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="Reason for rejection…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMut.mutate({ id: rejectId!, fb: feedback })} disabled={rejectMut.isPending}>
              {rejectMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!changesId} onOpenChange={(v) => !v && setChangesId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request changes</DialogTitle><DialogDescription>What needs to change before this can be approved?</DialogDescription></DialogHeader>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="What needs to change…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangesId(null)}>Cancel</Button>
            <Button onClick={() => changesMut.mutate({ id: changesId!, fb: feedback })} disabled={changesMut.isPending}>
              {changesMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submissions;

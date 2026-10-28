import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Loader2, Search, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { admin, type AdminReview, type AdminReviewReport } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const statusLabel: Record<string, string> = {
  published: "Published",
  hidden: "Hidden",
  flagged: "Flagged",
};

const ReviewsAdmin = () => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews", query, status],
    queryFn: () => admin.reviews({ query: query || undefined, status, limit: 100 }),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["admin", "review-reports"],
    queryFn: () => admin.reports(),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, value }: { id: string; value: "published" | "hidden" | "flagged" }) => admin.updateReviewStatus(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "review-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["places"] });
      toast({ title: "Review status updated" });
    },
    onError: (error: Error) => toast({ title: "Could not update review", description: error.message, variant: "destructive" }),
  });

  const deleteReview = useMutation({
    mutationFn: (id: string) => admin.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["places"] });
      toast({ title: "Review deleted" });
    },
    onError: (error: Error) => toast({ title: "Could not delete review", description: error.message, variant: "destructive" }),
  });
  const resolveReport = useMutation({
    mutationFn: (id: string) => admin.resolveReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "review-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "Report resolved" });
    },
    onError: (error: Error) => toast({ title: "Could not resolve report", description: error.message, variant: "destructive" }),
  });

  const analytics = data?.analytics;
  const maxTrend = Math.max(...(analytics?.trend ?? []).map((item) => item.count), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Community moderation</div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Reviews & ratings</h1>
          <p className="text-muted-foreground mt-1">Search, moderate, and understand what travellers are saying.</p>
        </div>
        <Button variant="outline" asChild><a href="#review-reports">Review reports</a></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Stat label="Total reviews" value={analytics?.total ?? 0} />
        <Stat label="Average rating" value={analytics?.average ? `${analytics.average} / 5` : "—"} />
        <Stat label="5-star reviews" value={analytics?.breakdown.find((item) => item.rating === 5)?.count ?? 0} />
        <Stat label="Flagged" value={analytics?.statusCounts.flagged ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px] mt-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-semibold">Review trend</h2>
          </div>
          {(analytics?.trend ?? []).length ? (
            <div className="h-36 flex items-end gap-2">
              {analytics!.trend.map((item) => (
                <div key={item.month} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{item.count}</span>
                  <div className="w-full rounded-t bg-primary/75 min-h-1" style={{ height: `${Math.max((item.count / maxTrend) * 100, 4)}%` }} title={`${item.month}: ${item.count} reviews`} />
                  <span className="text-[10px] text-muted-foreground">{item.month.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">Trend data will appear after reviews are submitted.</p>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-5">Rating breakdown</h2>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = analytics?.breakdown.find((item) => item.rating === rating)?.count ?? 0;
              const total = analytics?.total ?? 0;
              return (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <span className="w-7">{rating}<Star className="inline h-3 w-3 fill-saffron text-saffron" /></span>
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-saffron rounded-full" style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></div>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search review, place, or reviewer…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : data?.data.length ? data.data.map((review) => (
          <ReviewRow key={review.id} review={review} updating={updateStatus.isPending} deleting={deleteReview.isPending} onStatus={(value) => updateStatus.mutate({ id: review.id, value })} onDelete={() => deleteReview.mutate(review.id)} />
        )) : (
          <div className="rounded-2xl border border-dashed border-border p-14 text-center text-muted-foreground">No reviews match these filters.</div>
        )}
      </div>

      <section id="review-reports" className="mt-12 scroll-mt-8">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-2">Moderation queue</div>
            <h2 className="font-display text-2xl font-semibold">Review reports</h2>
          </div>
          <Badge variant="secondary">{reports.filter((item) => !item.report.resolved).length} open</Badge>
        </div>
        <div className="space-y-3">
          {reports.filter((item) => !item.report.resolved).length ? reports.filter((item) => !item.report.resolved).map((item) => (
            <ReportRow
              key={item.report.id}
              item={item}
              busy={resolveReport.isPending || updateStatus.isPending}
              onResolve={() => resolveReport.mutate(item.report.id)}
              onFlag={() => item.review && updateStatus.mutate({ id: item.review.id, value: "flagged" })}
            />
          )) : (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No open review reports.</div>
          )}
        </div>
      </section>
    </div>
  );
};

const ReviewRow = ({ review, updating, deleting, onStatus, onDelete }: {
  review: AdminReview;
  updating: boolean;
  deleting: boolean;
  onStatus: (value: "published" | "hidden" | "flagged") => void;
  onDelete: () => void;
}) => (
  <article className="rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/place/${review.place.slug}`} className="font-display font-semibold hover:text-primary">{review.place.title}</Link>
          <Badge variant={review.status === "published" ? "default" : review.status === "flagged" ? "destructive" : "secondary"}>{statusLabel[review.status]}</Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {review.reviewer?.name ?? "Unknown reviewer"} · {new Date(review.createdAt).toLocaleDateString()}
        </div>
        <div className="mt-3 flex items-center gap-2"><span className="font-semibold">{review.rating}/5</span><Star className="h-4 w-4 fill-saffron text-saffron" />{review.title && <span className="font-medium">· {review.title}</span>}</div>
        {review.body && <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{review.body}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Select value={review.status} onValueChange={(value) => onStatus(value as "published" | "hidden" | "flagged")} disabled={updating}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="published"><CheckCircle2 className="inline h-3.5 w-3.5 mr-1" /> Published</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={deleting} onClick={() => {
          if (window.confirm("Delete this review permanently? This cannot be undone.")) onDelete();
        }} aria-label="Delete review">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </article>
);

const ReportRow = ({ item, busy, onResolve, onFlag }: {
  item: AdminReviewReport;
  busy: boolean;
  onResolve: () => void;
  onFlag: () => void;
}) => (
  <article className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive">{item.report.reason}</Badge>
          <span className="text-sm text-muted-foreground">Reported by {item.reporter.name ?? "a traveller"} · {new Date(item.report.createdAt).toLocaleDateString()}</span>
        </div>
        {item.place && <Link to={`/place/${item.place.slug}#reviews`} className="mt-2 inline-block font-medium hover:text-primary">{item.place.title}</Link>}
        {item.review?.title && <div className="mt-1 text-sm font-medium">{item.review.title}</div>}
        {item.review?.body && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{item.review.body}</p>}
        {item.report.details && <p className="mt-2 text-sm">Report details: {item.report.details}</p>}
        {!item.review && <p className="mt-2 text-sm text-muted-foreground">This report is for a place, not a review.</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {item.review && item.review.status !== "flagged" && <Button variant="outline" size="sm" disabled={busy} onClick={onFlag}>Flag review</Button>}
        <Button size="sm" disabled={busy} onClick={onResolve}>Resolve</Button>
      </div>
    </div>
  </article>
);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{label}</div>
    <div className="font-display text-3xl font-semibold mt-2 tabular-nums">{value}</div>
  </div>
);

export default ReviewsAdmin;
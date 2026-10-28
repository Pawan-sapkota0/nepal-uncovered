import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Edit3, Flag, Loader2, MessageSquare, Star, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reports as reportsApi, reviews as reviewsApi, type ApiReview } from "@/lib/api";
import { useAuth } from "@/store/useAuth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Stars = ({ value, onChange, size = "md" }: { value: number; onChange?: (value: number) => void; size?: "sm" | "md" }) => (
  <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => {
      const icon = (
        <Star className={cn(
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          star <= value ? "fill-saffron text-saffron" : "text-muted-foreground/35",
        )} />
      );
      return onChange ? (
        <button key={star} type="button" onClick={() => onChange(star)} aria-label={`Rate ${star} out of 5`} className="rounded-sm p-0.5 hover:bg-saffron/10">
          {icon}
        </button>
      ) : <span key={star}>{icon}</span>;
    })}
  </div>
);

const ReviewsSection = ({ slug, placeId }: { slug: string; placeId: string }) => {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<"newest" | "highest" | "lowest" | "helpful">("newest");
  const [editing, setEditing] = useState<ApiReview | null>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [reporting, setReporting] = useState<ApiReview | null>(null);
  const [reportReason, setReportReason] = useState("offensive");
  const [reportDetails, setReportDetails] = useState("");

  const { data: pages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["reviews", slug, sort],
    queryFn: ({ pageParam }) => reviewsApi.list(slug, { sort, limit: 10, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset ?? undefined,
  });
  const data = pages?.pages[0];
  const listedReviews = pages?.pages.flatMap((page) => page.reviews) ?? [];
  const { data: myReviews = [] } = useQuery({
    queryKey: ["reviews", "mine", user?.id, placeId],
    queryFn: async () => (await reviewsApi.mine()).filter((review) => review.placeId === placeId),
    enabled: !!user,
  });
  const existingReview = myReviews[0] ?? listedReviews.find((review) => review.isOwner);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
    queryClient.invalidateQueries({ queryKey: ["reviews", "mine"] });
    queryClient.invalidateQueries({ queryKey: ["place", slug] });
    queryClient.invalidateQueries({ queryKey: ["places"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? reviewsApi.update(editing.id, { rating, title: title || null, body, visitDate: visitDate || null })
      : reviewsApi.create({ placeId, rating, title: title || undefined, body, visitDate: visitDate || undefined }),
    onSuccess: () => {
      invalidate();
      resetForm();
      toast({ title: editing ? "Review updated" : "Thanks for sharing", description: "Your rating is now part of the place profile." });
    },
    onError: (error: Error) => toast({ title: "Could not save review", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      invalidate();
      resetForm();
      toast({ title: "Review deleted" });
    },
    onError: (error: Error) => toast({ title: "Could not delete review", description: error.message, variant: "destructive" }),
  });

  const helpfulMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.toggleHelpful(id),
    onSuccess: (result, id) => {
      queryClient.setQueryData(["reviews", slug, sort], (current: typeof pages | undefined) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            reviews: page.reviews.map((review) => review.id === id
              ? { ...review, helpfulCount: result.helpfulCount, isHelpful: result.isHelpful }
              : review),
          })),
        };
      });
    },
    onError: (error: Error) => toast({ title: "Could not record vote", description: error.message, variant: "destructive" }),
  });

  const reportMutation = useMutation({
    mutationFn: () => {
      if (!reporting) throw new Error("Select a review to report.");
      return reportsApi.create({
        placeId,
        reviewId: reporting.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
    },
    onSuccess: () => {
      setReporting(null);
      setReportDetails("");
      toast({ title: "Report submitted", description: "A moderator will review this report." });
    },
    onError: (error: Error) => toast({ title: "Could not submit report", description: error.message, variant: "destructive" }),
  });

  function resetForm() {
    setEditing(null);
    setRating(0);
    setTitle("");
    setBody("");
    setVisitDate("");
  }

  function startEditing(review: ApiReview) {
    setEditing(review);
    setRating(review.rating);
    setTitle(review.title ?? "");
    setBody(review.body ?? "");
    setVisitDate(review.visitDate ?? "");
    document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const average = data?.average ? Number(data.average) : 0;
  const breakdown = data?.breakdown ?? [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 }));

  return (
    <section id="reviews" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-3 inline-flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Traveller reviews
          </div>
          <h2 className="font-display text-3xl font-semibold">What visitors say</h2>
          <p className="mt-2 text-muted-foreground">Practical notes from people who have been here.</p>
        </div>
        <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="highest">Highest rated</SelectItem>
            <SelectItem value="lowest">Lowest rated</SelectItem>
            <SelectItem value="helpful">Most helpful</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr] rounded-2xl border border-border bg-card p-6">
        <div className="text-center md:border-r md:border-border md:pr-6">
          <div className="font-display text-5xl font-semibold">{data?.count ? average.toFixed(1) : "—"}</div>
          <Stars value={Math.round(average)} size="sm" />
          <p className="mt-2 text-sm text-muted-foreground">{data?.count ?? 0} review{data?.count === 1 ? "" : "s"}</p>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const item = breakdown.find((row) => row.rating === rating);
            const percentage = data?.count ? (Number(item?.count ?? 0) / data.count) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-muted-foreground">{rating} <Star className="inline h-3 w-3 fill-saffron text-saffron" /></span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-saffron transition-all" style={{ width: `${percentage}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{item?.count ?? 0}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div id="review-form" className="rounded-2xl border border-accent/25 bg-accent-soft/40 p-6">
        {!user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold">Have you visited?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to leave a rating and help other travellers plan.</p>
            </div>
            <Button variant="hero" asChild><Link to="/auth?mode=login">Sign in to review</Link></Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-display text-xl font-semibold">{editing ? "Edit your review" : existingReview ? "You have reviewed this place" : "Share your experience"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">One review per place. You can change it anytime.</p>
              </div>
              {existingReview && !editing && <Button variant="outline" size="sm" onClick={() => startEditing(existingReview)}><Edit3 className="h-3.5 w-3.5" /> Edit review</Button>}
              {editing && <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
            </div>
            {(!existingReview || editing) && <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Your rating</label>
                <div className="mt-2"><Stars value={rating} onChange={setRating} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="review-title" className="text-sm font-medium">Title <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input id="review-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A useful short summary" maxLength={120} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="review-date" className="text-sm font-medium">Visit date <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input id="review-date" type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="review-body" className="text-sm font-medium">Your review</label>
                <Textarea id="review-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="What should another traveller know?" maxLength={5000} rows={4} required />
              </div>
              <div className="flex justify-end">
                <Button variant="hero" disabled={rating === 0 || !body.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Save changes" : "Post review"}
                </Button>
              </div>
            </div>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : listedReviews.length ? (
          listedReviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-sunset grid place-items-center font-semibold text-accent-foreground">
                    {(review.reviewer?.name ?? "T").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{review.reviewer?.name ?? "Hidden Nepal traveller"}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(review.createdAt).toLocaleDateString()}</span>
                      {review.isVerifiedVisit && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Verified visit</span>}
                    </div>
                  </div>
                </div>
                <Stars value={review.rating} size="sm" />
              </div>
              {review.title && <h3 className="mt-5 font-display text-lg font-semibold">{review.title}</h3>}
              {review.body && <p className="mt-2 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{review.body}</p>}
              {review.visitDate && <p className="mt-3 text-xs text-muted-foreground">Visited {new Date(`${review.visitDate}T00:00:00`).toLocaleDateString()}</p>}
              <div className="mt-5 flex items-center gap-2">
                {user && !review.isOwner && (
                  <>
                    <Button variant="outline" size="sm" disabled={helpfulMutation.isPending} onClick={() => helpfulMutation.mutate(review.id)}>
                      <ThumbsUp className={cn("h-3.5 w-3.5", review.isHelpful && "fill-current")} />
                      Helpful · {review.helpfulCount}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setReporting(review)}>
                      <Flag className="h-3.5 w-3.5" /> Report
                    </Button>
                  </>
                )}
                {!user && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {review.helpfulCount} found this helpful</span>}
              </div>
              {review.isOwner && (
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEditing(review)}><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(review.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 font-display text-lg font-semibold">No reviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first traveller to share a useful note.</p>
          </div>
        )}
        {hasNextPage && (
          <div className="text-center">
            <Button variant="outline" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
              Load more reviews
            </Button>
          </div>
        )}
      </div>
      <Dialog open={!!reporting} onOpenChange={(open) => !open && setReporting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report this review</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tell moderators why this review needs attention.</p>
          <Select value={reportReason} onValueChange={setReportReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inaccurate">Inaccurate</SelectItem>
              <SelectItem value="unsafe">Unsafe</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="offensive">Offensive</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Additional details (optional)" maxLength={2000} rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReporting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={reportMutation.isPending} onClick={() => reportMutation.mutate()}>
              {reportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ReviewsSection;
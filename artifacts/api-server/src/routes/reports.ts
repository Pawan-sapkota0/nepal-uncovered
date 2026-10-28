import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, reportsTable, placesTable, reviewsTable } from "@workspace/db";
import { authenticate } from "../middlewares/authenticate";
import { z } from "zod";

const router: IRouter = Router();

const reportSchema = z.object({
  placeId: z.string().uuid(),
  reviewId: z.string().uuid().optional(),
  reason: z.enum(["inaccurate", "unsafe", "spam", "duplicate", "offensive", "other"]),
  details: z.string().trim().max(2000).optional(),
});

router.post("/reports", authenticate, async (req, res): Promise<void> => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation_error", message: parsed.error.message } });
    return;
  }
  const [place] = await db.select({ id: placesTable.id, status: placesTable.status })
    .from(placesTable).where(eq(placesTable.id, parsed.data.placeId));
  if (!place || place.status !== "approved") {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }
  if (parsed.data.reviewId) {
    const [review] = await db.select({
      id: reviewsTable.id,
      placeId: reviewsTable.placeId,
      status: reviewsTable.status,
      userId: reviewsTable.userId,
    })
      .from(reviewsTable).where(eq(reviewsTable.id, parsed.data.reviewId));
    if (!review || review.placeId !== parsed.data.placeId || review.status !== "published") {
      res.status(404).json({ error: { code: "not_found", message: "Review not found" } });
      return;
    }
    if (review.userId === req.user!.sub) {
      res.status(400).json({ error: { code: "own_review_report", message: "You cannot report your own review" } });
      return;
    }
  }
  const [report] = await db.insert(reportsTable).values({
    ...parsed.data, reporterId: req.user!.sub,
  }).onConflictDoNothing({ target: [reportsTable.reporterId, reportsTable.reviewId] }).returning();
  if (!report) {
    res.status(409).json({ error: { code: "already_reported", message: "You have already reported this review" } });
    return;
  }
  res.status(201).json(report);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, avg, count } from "drizzle-orm";
import { db, reviewsTable, placesTable, profilesTable } from "@workspace/db";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { z } from "zod";

const router: IRouter = Router();

const reviewSchema = z.object({
  placeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
});

router.get("/places/:slug/reviews", optionalAuthenticate, async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [place] = await db.select({ id: placesTable.id }).from(placesTable).where(eq(placesTable.slug, slug));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  const rows = await db
    .select({ review: reviewsTable, name: profilesTable.name, avatarUrl: profilesTable.avatarUrl })
    .from(reviewsTable)
    .leftJoin(profilesTable, eq(reviewsTable.userId, profilesTable.userId))
    .where(eq(reviewsTable.placeId, place.id));

  const stats = await db.select({
    avg: avg(reviewsTable.rating),
    count: count(reviewsTable.id),
  }).from(reviewsTable).where(eq(reviewsTable.placeId, place.id));

  res.json({
    reviews: rows.map((r) => ({ ...r.review, reviewer: { name: r.name, avatarUrl: r.avatarUrl } })),
    average: stats[0]?.avg ? Number(stats[0].avg).toFixed(1) : null,
    count: stats[0]?.count ?? 0,
  });
});

router.post("/reviews", authenticate, async (req, res): Promise<void> => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation_error", message: parsed.error.message } });
    return;
  }
  const userId = req.user!.sub;
  const { placeId, rating, body } = parsed.data;

  const existing = await db.select({ id: reviewsTable.id }).from(reviewsTable)
    .where(and(eq(reviewsTable.userId, userId), eq(reviewsTable.placeId, placeId)));
  if (existing.length > 0) {
    res.status(409).json({ error: { code: "already_reviewed", message: "You have already reviewed this place" } });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({ placeId, userId, rating, body }).returning();
  res.status(201).json(review);
});

router.patch("/reviews/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = req.user!.sub;
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) {
    res.status(404).json({ error: { code: "not_found", message: "Review not found" } });
    return;
  }
  if (review.userId !== userId && !req.user!.roles.includes("admin")) {
    res.status(403).json({ error: { code: "forbidden", message: "Cannot edit this review" } });
    return;
  }
  const { rating, body } = req.body;
  const [updated] = await db.update(reviewsTable).set({
    ...(rating != null ? { rating } : {}),
    ...(body != null ? { body } : {}),
  }).where(eq(reviewsTable.id, id)).returning();
  res.json(updated);
});

router.delete("/reviews/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = req.user!.sub;
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) {
    res.status(404).json({ error: { code: "not_found", message: "Review not found" } });
    return;
  }
  if (review.userId !== userId && !req.user!.roles.includes("admin")) {
    res.status(403).json({ error: { code: "forbidden", message: "Cannot delete this review" } });
    return;
  }
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

export default router;

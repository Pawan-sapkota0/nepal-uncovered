import { Router, type IRouter } from "express";
import { and, asc, avg, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db, reviewsTable, reviewVotesTable, placesTable, profilesTable } from "@workspace/db";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { isStaff } from "../middlewares/requireRole";
import { z } from "zod";

const router: IRouter = Router();

const reviewFields = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).nullable().optional(),
  body: z.string().trim().min(1).max(5000),
  visitDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    })
    .nullable()
    .optional(),
  photos: z.array(z.string().min(1).startsWith("/objects/")).max(5).optional(),
});

const createReviewSchema = reviewFields.extend({
  placeId: z.string().uuid(),
});

const updateReviewSchema = reviewFields.partial();

async function refreshPlaceRating(database: any, placeId: string) {
  const [stats] = await database
    .select({ average: avg(reviewsTable.rating), total: count(reviewsTable.id) })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.placeId, placeId), eq(reviewsTable.status, "published")));

  const total = Number(stats?.total ?? 0);
  const average = stats?.average == null ? "0" : Number(stats.average).toFixed(2);
  await database.update(placesTable)
    .set({ ratingAverage: average, ratingCount: total })
    .where(eq(placesTable.id, placeId));
}

async function getPlaceBySlug(slug: string) {
  const [place] = await db
    .select({ id: placesTable.id, status: placesTable.status })
    .from(placesTable)
    .where(eq(placesTable.slug, slug));
  return place;
}

router.get("/places/:slug/reviews", optionalAuthenticate, async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const place = await getPlaceBySlug(slug);
  if (!place || place.status !== "approved") {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const sort = String(req.query.sort ?? "newest");
  const orderBy = sort === "highest"
    ? [desc(reviewsTable.rating), desc(reviewsTable.createdAt)]
    : sort === "lowest"
      ? [asc(reviewsTable.rating), desc(reviewsTable.createdAt)]
      : sort === "helpful"
        ? [desc(reviewsTable.helpfulCount), desc(reviewsTable.createdAt)]
        : [desc(reviewsTable.createdAt)];

  const rows = await db
    .select({ review: reviewsTable, name: profilesTable.name, avatarUrl: profilesTable.avatarUrl })
    .from(reviewsTable)
    .leftJoin(profilesTable, eq(reviewsTable.userId, profilesTable.userId))
    .where(and(eq(reviewsTable.placeId, place.id), eq(reviewsTable.status, "published")))
    .orderBy(...orderBy)
    .limit(limit + 1)
    .offset(offset);
  const voteIds = req.user && rows.length
    ? await db.select({ reviewId: reviewVotesTable.reviewId })
      .from(reviewVotesTable)
      .where(and(
        eq(reviewVotesTable.userId, req.user.sub),
        inArray(reviewVotesTable.reviewId, rows.map((row) => row.review.id)),
      ))
    : [];
  const votedIds = new Set(voteIds.map((vote) => vote.reviewId));

  const [stats] = await db
    .select({ average: avg(reviewsTable.rating), total: count(reviewsTable.id) })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.placeId, place.id), eq(reviewsTable.status, "published")));
  const breakdownRows = await db
    .select({ rating: reviewsTable.rating, count: count(reviewsTable.id) })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.placeId, place.id), eq(reviewsTable.status, "published")))
    .groupBy(reviewsTable.rating);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  const breakdown = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: Number(breakdownRows.find((row) => row.rating === rating)?.count ?? 0),
  }));

  res.json({
    reviews: data.map((row) => ({
      ...row.review,
      reviewer: { name: row.name ?? "Hidden Nepal traveller", avatarUrl: row.avatarUrl },
      isOwner: row.review.userId === req.user?.sub,
      isHelpful: votedIds.has(row.review.id),
    })),
    average: stats?.average == null ? null : Number(stats.average).toFixed(1),
    count: Number(stats?.total ?? 0),
    breakdown,
    nextOffset: hasMore ? offset + limit : null,
    limit,
    offset,
  });
});

router.get("/reviews/me", authenticate, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      review: reviewsTable,
      place: { id: placesTable.id, slug: placesTable.slug, title: placesTable.title },
    })
    .from(reviewsTable)
    .innerJoin(placesTable, eq(reviewsTable.placeId, placesTable.id))
    .where(eq(reviewsTable.userId, req.user!.sub))
    .orderBy(desc(reviewsTable.updatedAt));
  res.json(rows.map((row) => ({ ...row.review, place: row.place })));
});

router.post("/reviews", authenticate, async (req, res): Promise<void> => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation_error", message: parsed.error.message } });
    return;
  }

  const { placeId, ...reviewData } = parsed.data;
  const [place] = await db.select({ id: placesTable.id, status: placesTable.status })
    .from(placesTable).where(eq(placesTable.id, placeId));
  if (!place || place.status !== "approved") {
    res.status(404).json({ error: { code: "place_not_found", message: "Reviews can only be added to approved places" } });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [review] = await tx.insert(reviewsTable)
      .values({ ...reviewData, placeId, userId: req.user!.sub })
      .onConflictDoNothing({ target: [reviewsTable.userId, reviewsTable.placeId] })
      .returning();
    if (!review) return null;
    await refreshPlaceRating(tx, placeId);
    return review;
  });

  if (!result) {
    res.status(409).json({ error: { code: "already_reviewed", message: "You have already reviewed this place" } });
    return;
  }
  res.status(201).json(result);
});

router.post("/reviews/:id/helpful", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [review] = await db.select({
    id: reviewsTable.id, userId: reviewsTable.userId, status: reviewsTable.status,
  }).from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review || review.status !== "published") {
    res.status(404).json({ error: { code: "not_found", message: "Review not found" } });
    return;
  }
  if (review.userId === req.user!.sub) {
    res.status(400).json({ error: { code: "own_review_vote", message: "You cannot vote on your own review" } });
    return;
  }

  const [result] = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: reviewVotesTable.id }).from(reviewVotesTable)
      .where(and(eq(reviewVotesTable.reviewId, id), eq(reviewVotesTable.userId, req.user!.sub)));
    if (existing) {
      await tx.delete(reviewVotesTable).where(eq(reviewVotesTable.id, existing.id));
      const [updated] = await tx.update(reviewsTable)
        .set({ helpfulCount: sql`greatest(${reviewsTable.helpfulCount} - 1, 0)` })
        .where(eq(reviewsTable.id, id))
        .returning({ helpfulCount: reviewsTable.helpfulCount });
      return [{ helpfulCount: updated.helpfulCount, isHelpful: false }];
    }

    const [inserted] = await tx.insert(reviewVotesTable)
      .values({ reviewId: id, userId: req.user!.sub })
      .onConflictDoNothing()
      .returning({ id: reviewVotesTable.id });
    if (inserted) {
      const [updated] = await tx.update(reviewsTable)
        .set({ helpfulCount: sql`${reviewsTable.helpfulCount} + 1` })
        .where(eq(reviewsTable.id, id))
        .returning({ helpfulCount: reviewsTable.helpfulCount });
      return [{ helpfulCount: updated.helpfulCount, isHelpful: true }];
    }
    const [current] = await tx.select({ helpfulCount: reviewsTable.helpfulCount })
      .from(reviewsTable).where(eq(reviewsTable.id, id));
    return [{ helpfulCount: current.helpfulCount, isHelpful: true }];
  });
  res.json(result);
});

router.patch("/reviews/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = updateReviewSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: { code: "validation_error", message: "Provide at least one valid review field" } });
    return;
  }

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) {
    res.status(404).json({ error: { code: "not_found", message: "Review not found" } });
    return;
  }
  const staff = isStaff(req.user!.roles);
  if (review.userId !== req.user!.sub && !staff) {
    res.status(403).json({ error: { code: "forbidden", message: "Cannot edit this review" } });
    return;
  }

  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(reviewsTable).set(parsed.data).where(eq(reviewsTable.id, id)).returning();
    await refreshPlaceRating(tx, review.placeId);
    return rows;
  });
  res.json(updated);
});

router.delete("/reviews/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) {
    res.status(404).json({ error: { code: "not_found", message: "Review not found" } });
    return;
  }
  if (review.userId !== req.user!.sub && !isStaff(req.user!.roles)) {
    res.status(403).json({ error: { code: "forbidden", message: "Cannot delete this review" } });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(reviewsTable).where(eq(reviewsTable.id, id));
    await refreshPlaceRating(tx, review.placeId);
  });
  res.sendStatus(204);
});

export default router;
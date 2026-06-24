import { Router, type IRouter } from "express";
import { eq, and, or, ilike, sql, desc, asc, inArray } from "drizzle-orm";
import { db, placesTable, categoriesTable, profilesTable, placeViewsTable, bookmarksTable } from "@workspace/db";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { requireMinRole, isStaff } from "../middlewares/requireRole";
import { createHash } from "crypto";

const router: IRouter = Router();

router.get("/places", optionalAuthenticate, async (req, res): Promise<void> => {
  const { query, category, province, district, difficulty, hidden, sort, cursor, limit } = req.query as Record<string, string>;
  const pageSize = Math.min(parseInt(limit ?? "20", 10), 100);
  const userRoles = req.user?.roles ?? [];
  const staff = isStaff(userRoles);

  const conditions: any[] = [];

  if (!staff) {
    conditions.push(eq(placesTable.status, "approved"));
  }

  if (category) conditions.push(eq(placesTable.categorySlug, category));
  if (province) conditions.push(eq(placesTable.province, province as any));
  if (district) conditions.push(ilike(placesTable.district, `%${district}%`));
  if (difficulty) conditions.push(eq(placesTable.difficulty, difficulty as any));
  if (hidden === "true") conditions.push(eq(placesTable.hidden, true));

  if (query) {
    conditions.push(
      or(
        ilike(placesTable.title, `%${query}%`),
        ilike(placesTable.shortDescription, `%${query}%`),
        ilike(placesTable.district, `%${query}%`),
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let sortExpr;
  switch (sort) {
    case "views": sortExpr = desc(placesTable.views); break;
    case "oldest": sortExpr = asc(placesTable.createdAt); break;
    case "featured": sortExpr = desc(placesTable.featured); break;
    default: sortExpr = desc(placesTable.createdAt);
  }

  const rows = await db.select().from(placesTable)
    .where(where)
    .orderBy(sortExpr)
    .limit(pageSize + 1)
    .offset(cursor ? parseInt(cursor, 10) : 0);

  const hasMore = rows.length > pageSize;
  const data = rows.slice(0, pageSize);
  const nextCursor = hasMore ? String((cursor ? parseInt(cursor, 10) : 0) + pageSize) : null;

  // Check bookmarks if authenticated
  let bookmarkedIds: Set<string> = new Set();
  if (req.user && data.length > 0) {
    const bmarks = await db.select({ placeId: bookmarksTable.placeId })
      .from(bookmarksTable)
      .where(and(
        eq(bookmarksTable.userId, req.user.sub),
        inArray(bookmarksTable.placeId, data.map(p => p.id)),
      ));
    bookmarkedIds = new Set(bmarks.map(b => b.placeId));
  }

  res.json({
    data: data.map(p => ({ ...p, bookmarked: bookmarkedIds.has(p.id) })),
    nextCursor,
    total: data.length,
  });
});

router.get("/places/:slug", optionalAuthenticate, async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const userRoles = req.user?.roles ?? [];
  const staff = isStaff(userRoles);

  const [place] = await db.select().from(placesTable).where(eq(placesTable.slug, slug));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  if (place.status !== "approved" && !staff && place.submittedBy !== req.user?.sub) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  let bookmarked = false;
  if (req.user) {
    const [bm] = await db.select().from(bookmarksTable)
      .where(and(eq(bookmarksTable.userId, req.user.sub), eq(bookmarksTable.placeId, place.id)));
    bookmarked = !!bm;
  }

  res.json({ ...place, bookmarked });
});

router.post("/places/:slug/view", optionalAuthenticate, async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [place] = await db.select({ id: placesTable.id }).from(placesTable)
    .where(and(eq(placesTable.slug, slug), eq(placesTable.status, "approved")));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  const ip = req.ip ?? "unknown";
  const ipHash = createHash("sha256").update(ip + slug + Math.floor(Date.now() / 1800000)).digest("hex");

  await db.insert(placeViewsTable).values({
    placeId: place.id,
    viewerId: req.user?.sub ?? null,
    ipHash,
  }).onConflictDoNothing();

  await db.update(placesTable).set({ views: sql`${placesTable.views} + 1` }).where(eq(placesTable.id, place.id));
  res.sendStatus(204);
});

router.post("/places", authenticate, requireMinRole("contributor"), async (req, res): Promise<void> => {
  const { slug, title, shortDescription, description, history, categorySlug, district, province, lat, lng,
    coverImage, images, hidden, bestSeason, difficulty, costEstimate, permits, durationDays,
    nearbyHospital, emergency, localSupport } = req.body;

  if (!slug || !title || !shortDescription || !description || !district || !province || lat == null || lng == null) {
    res.status(400).json({ error: { code: "validation_error", message: "Missing required fields" } });
    return;
  }

  const [place] = await db.insert(placesTable).values({
    slug, title, shortDescription, description, history, categorySlug, district, province,
    lat: String(lat), lng: String(lng), coverImage, images: images ?? [],
    hidden: !!hidden, bestSeason, difficulty, costEstimate, permits,
    durationDays: durationDays ? Number(durationDays) : null,
    nearbyHospital, emergency, localSupport,
    status: "pending", submittedBy: req.user!.sub,
  }).returning();

  await db.insert(
    (await import("@workspace/db")).submissionsTable
  ).values({ placeId: place.id, userId: req.user!.sub, status: "pending" });

  req.log.info({ placeId: place.id, userId: req.user!.sub }, "Place created");
  res.status(201).json(place);
});

router.patch("/places/:id", authenticate, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [place] = await db.select().from(placesTable).where(eq(placesTable.id, id));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  const userRoles = req.user!.roles;
  const staff = isStaff(userRoles);
  const isOwner = place.submittedBy === req.user!.sub;
  const editableStatuses = ["draft", "pending", "changes_requested"];

  if (!staff && (!isOwner || !editableStatuses.includes(place.status))) {
    res.status(403).json({ error: { code: "forbidden", message: "Cannot edit this place" } });
    return;
  }

  const { title, shortDescription, description, history, categorySlug, district, province,
    lat, lng, coverImage, images, hidden, featured, bestSeason, difficulty, costEstimate,
    permits, durationDays, nearbyHospital, emergency, localSupport, status } = req.body;

  const updateData: Partial<typeof place> = {};
  if (title != null) updateData.title = title;
  if (shortDescription != null) updateData.shortDescription = shortDescription;
  if (description != null) updateData.description = description;
  if (history != null) updateData.history = history;
  if (categorySlug != null) updateData.categorySlug = categorySlug;
  if (district != null) updateData.district = district;
  if (province != null) updateData.province = province;
  if (lat != null) updateData.lat = String(lat);
  if (lng != null) updateData.lng = String(lng);
  if (coverImage != null) updateData.coverImage = coverImage;
  if (images != null) updateData.images = images;
  if (hidden != null) updateData.hidden = hidden;
  if (bestSeason != null) updateData.bestSeason = bestSeason;
  if (difficulty != null) updateData.difficulty = difficulty;
  if (costEstimate != null) updateData.costEstimate = costEstimate;
  if (permits != null) updateData.permits = permits;
  if (durationDays != null) updateData.durationDays = durationDays;
  if (nearbyHospital != null) updateData.nearbyHospital = nearbyHospital;
  if (emergency != null) updateData.emergency = emergency;
  if (localSupport != null) updateData.localSupport = localSupport;
  if (staff && featured != null) updateData.featured = featured;
  if (staff && status != null) updateData.status = status;

  const [updated] = await db.update(placesTable).set(updateData).where(eq(placesTable.id, id)).returning();
  res.json(updated);
});

export default router;

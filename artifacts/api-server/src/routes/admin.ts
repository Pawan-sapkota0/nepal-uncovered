import { Router, type IRouter } from "express";
import { eq, and, or, desc, count, sql, ilike } from "drizzle-orm";
import { db, placesTable, submissionsTable, usersTable, profilesTable, userRolesTable, reportsTable, categoriesTable, auditLogTable } from "@workspace/db";
import { authenticate } from "../middlewares/authenticate";
import { requireRole, requireMinRole } from "../middlewares/requireRole";
import { sendApprovedEmail, sendRejectedEmail, sendChangesRequestedEmail } from "../lib/email";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// All admin routes require authentication + at least moderator
router.use(authenticate, requireMinRole("moderator"));

// Submissions management
router.get("/submissions", async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const rows = await db
    .select({
      submission: submissionsTable,
      place: { id: placesTable.id, slug: placesTable.slug, title: placesTable.title, status: placesTable.status, coverImage: placesTable.coverImage, images: placesTable.images },
      submitter: { name: profilesTable.name, email: usersTable.email },
    })
    .from(submissionsTable)
    .innerJoin(placesTable, eq(submissionsTable.placeId, placesTable.id))
    .innerJoin(usersTable, eq(submissionsTable.userId, usersTable.id))
    .innerJoin(profilesTable, eq(submissionsTable.userId, profilesTable.userId))
    .where(status ? eq(submissionsTable.status, status as any) : undefined)
    .orderBy(desc(submissionsTable.submittedAt));
  res.json(rows);
});

router.post("/submissions/:id/approve", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const reviewerId = req.user!.sub;

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) {
    res.status(404).json({ error: { code: "not_found", message: "Submission not found" } });
    return;
  }

  const [[place], [user], [profile]] = await Promise.all([
    db.select({ slug: placesTable.slug, title: placesTable.title }).from(placesTable).where(eq(placesTable.id, submission.placeId)),
    db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, submission.userId)),
    db.select({ name: profilesTable.name }).from(profilesTable).where(eq(profilesTable.userId, submission.userId)),
  ]);

  await db.update(submissionsTable).set({
    status: "approved", reviewedAt: new Date(), reviewedBy: reviewerId,
  }).where(eq(submissionsTable.id, id));

  await db.update(placesTable).set({
    status: "approved", approvedBy: reviewerId, approvedAt: new Date(),
  }).where(eq(placesTable.id, submission.placeId));

  await db.update(profilesTable)
    .set({ contributionsCount: sql`${profilesTable.contributionsCount} + 1` })
    .where(eq(profilesTable.userId, submission.userId));

  req.log.info({ submissionId: id, reviewerId }, "Submission approved");
  res.json({ message: "Approved" });

  // Send email non-blocking (after response)
  if (user && place && profile) {
    sendApprovedEmail({
      to: user.email,
      contributorName: profile.name,
      placeTitle: place.title,
      placeSlug: place.slug,
    }).catch((err) => req.log.error({ err }, "Failed to send approval email"));
  }
});

router.post("/submissions/:id/reject", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { feedback } = req.body;
  const reviewerId = req.user!.sub;

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) {
    res.status(404).json({ error: { code: "not_found", message: "Submission not found" } });
    return;
  }

  const [[place], [user], [profile]] = await Promise.all([
    db.select({ slug: placesTable.slug, title: placesTable.title }).from(placesTable).where(eq(placesTable.id, submission.placeId)),
    db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, submission.userId)),
    db.select({ name: profilesTable.name }).from(profilesTable).where(eq(profilesTable.userId, submission.userId)),
  ]);

  await db.update(submissionsTable).set({
    status: "rejected", feedback, reviewedAt: new Date(), reviewedBy: reviewerId,
  }).where(eq(submissionsTable.id, id));

  await db.update(placesTable).set({ status: "rejected" }).where(eq(placesTable.id, submission.placeId));

  req.log.info({ submissionId: id, reviewerId }, "Submission rejected");
  res.json({ message: "Rejected" });

  if (user && place && profile) {
    sendRejectedEmail({
      to: user.email,
      contributorName: profile.name,
      placeTitle: place.title,
      placeSlug: place.slug,
      feedback,
    }).catch((err) => req.log.error({ err }, "Failed to send rejection email"));
  }
});

router.post("/submissions/:id/request-changes", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { feedback } = req.body;
  const reviewerId = req.user!.sub;

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) {
    res.status(404).json({ error: { code: "not_found", message: "Submission not found" } });
    return;
  }

  const [[place], [user], [profile]] = await Promise.all([
    db.select({ slug: placesTable.slug, title: placesTable.title }).from(placesTable).where(eq(placesTable.id, submission.placeId)),
    db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, submission.userId)),
    db.select({ name: profilesTable.name }).from(profilesTable).where(eq(profilesTable.userId, submission.userId)),
  ]);

  await db.update(submissionsTable).set({
    status: "changes_requested", feedback, reviewedAt: new Date(), reviewedBy: reviewerId,
  }).where(eq(submissionsTable.id, id));

  res.json({ message: "Changes requested" });

  if (user && place && profile) {
    sendChangesRequestedEmail({
      to: user.email,
      contributorName: profile.name,
      placeTitle: place.title,
      placeSlug: place.slug,
      feedback,
    }).catch((err) => req.log.error({ err }, "Failed to send changes-requested email"));
  }
});


// Users management (admin only)
router.get("/users", requireRole("admin"), async (req, res): Promise<void> => {
  const rows = await db
    .select({
      user: { id: usersTable.id, email: usersTable.email, createdAt: usersTable.createdAt, disabledAt: usersTable.disabledAt },
      profile: { name: profilesTable.name, bio: profilesTable.bio, avatarUrl: profilesTable.avatarUrl, contributionsCount: profilesTable.contributionsCount, joinedAt: profilesTable.joinedAt },
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(usersTable.id, profilesTable.userId))
    .orderBy(desc(usersTable.createdAt));

  const withRoles = await Promise.all(rows.map(async (r) => {
    const roles = await db.select({ role: userRolesTable.role }).from(userRolesTable).where(eq(userRolesTable.userId, r.user.id));
    return { ...r.user, ...r.profile, roles: roles.map((x) => x.role) };
  }));
  res.json(withRoles);
});

router.patch("/users/:id/roles", requireRole("admin"), async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { roles } = req.body as { roles: string[] };
  if (!Array.isArray(roles)) {
    res.status(400).json({ error: { code: "validation_error", message: "roles must be an array" } });
    return;
  }

  await db.delete(userRolesTable).where(eq(userRolesTable.userId, userId));
  if (roles.length > 0) {
    await db.insert(userRolesTable).values(roles.map((role) => ({ userId, role: role as any })));
  }
  res.json({ message: "Roles updated" });
});

// ── Category management ────────────────────────────────────────────────────
import { z as _z } from "zod/v4";

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      slug: categoriesTable.slug,
      name: categoriesTable.name,
      description: categoriesTable.description,
      icon: categoriesTable.icon,
      coverImage: categoriesTable.coverImage,
      sortOrder: categoriesTable.sortOrder,
    })
    .from(categoriesTable)
    .orderBy(categoriesTable.sortOrder);
  res.json(rows);
});

router.post("/categories", requireRole("admin"), async (req, res): Promise<void> => {
  const schema = _z.object({
    slug: _z.string().min(1),
    name: _z.string().min(1),
    description: _z.string().optional(),
    icon: _z.string().optional(),
    coverImage: _z.string().min(1).startsWith("/objects/"),
    sortOrder: _z.number().int().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: { code: "validation" } }); return; }

  try {
    await objectStorageService.getObjectEntityFile(parsed.data.coverImage);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(400).json({ error: { code: "invalid_cover_image", message: "Cover image was not found in storage" } });
      return;
    }
    throw error;
  }

  const [cat] = await db.insert(categoriesTable).values(parsed.data).onConflictDoNothing().returning();
  if (!cat) { res.status(409).json({ error: { code: "conflict", message: "Slug already exists" } }); return; }
  res.status(201).json(cat);
});

router.patch("/categories/:slug", requireRole("admin"), async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  const schema = _z.object({
    name: _z.string().min(1).optional(),
    description: _z.string().optional(),
    icon: _z.string().optional(),
    coverImage: _z.string().min(1).startsWith("/objects/").optional(),
    sortOrder: _z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: { code: "validation" } }); return; }

  const [existing] = await db
    .select({ coverImage: categoriesTable.coverImage })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug));
  if (!existing) { res.status(404).json({ error: { code: "not_found" } }); return; }
  if (!parsed.data.coverImage && !existing.coverImage) {
    res.status(400).json({ error: { code: "cover_image_required", message: "Upload a cover image before saving this category" } });
    return;
  }

  if (parsed.data.coverImage) {
    try {
      await objectStorageService.getObjectEntityFile(parsed.data.coverImage);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(400).json({ error: { code: "invalid_cover_image", message: "Cover image was not found in storage" } });
        return;
      }
      throw error;
    }
  }

  const [cat] = await db.update(categoriesTable).set(parsed.data).where(eq(categoriesTable.slug, slug)).returning();
  if (!cat) { res.status(404).json({ error: { code: "not_found" } }); return; }
  res.json(cat);
});

router.delete("/categories/:slug", requireRole("admin"), async (req, res): Promise<void> => {
  const slug = String(req.params.slug);
  await db.delete(categoriesTable).where(eq(categoriesTable.slug, slug));
  res.status(204).send();
});

// ── Activity / Audit Log ───────────────────────────────────────────────────
router.get("/activity", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const action = req.query.action as string | undefined;

  const rows = await db
    .select({
      id: auditLogTable.id,
      action: auditLogTable.action,
      entity: auditLogTable.entity,
      entityId: auditLogTable.entityId,
      meta: auditLogTable.meta,
      createdAt: auditLogTable.createdAt,
      actorName: profilesTable.name,
      actorEmail: usersTable.email,
    })
    .from(auditLogTable)
    .leftJoin(usersTable, eq(auditLogTable.actorId, usersTable.id))
    .leftJoin(profilesTable, eq(auditLogTable.actorId, profilesTable.userId))
    .where(action ? eq(auditLogTable.action, action) : undefined)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(auditLogTable)
    .where(action ? eq(auditLogTable.action, action) : undefined);

  res.json({ data: rows, total, limit, offset });
});

// Reports management
router.get("/reports", async (req, res): Promise<void> => {
  const rows = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
  res.json(rows);
});

router.patch("/reports/:id/resolve", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.update(reportsTable).set({ resolved: true }).where(eq(reportsTable.id, id));
  res.json({ message: "Resolved" });
});

// ── Admin Places management ───────────────────────────────────────────────────

const adminPlaceImageFieldsSchema = _z.object({
  coverImage: _z.string().min(1).nullable().optional(),
  images: _z.array(_z.string().min(1)).max(10).optional(),
});

async function verifyStoredPlaceImages(paths: Array<string | null | undefined>) {
  await Promise.all(
    paths
      .filter((path): path is string => !!path && path.startsWith("/objects/"))
      .map((path) => objectStorageService.getObjectEntityFile(path)),
  );
}

// GET /admin/places — list all places (all statuses) with optional filter
router.get("/places", async (req, res): Promise<void> => {
  const { status, query, limit: limitStr } = req.query as Record<string, string>;
  const pageSize = Math.min(parseInt(limitStr ?? "200", 10), 200);

  const conditions: any[] = [];
  if (status && status !== "all") conditions.push(eq(placesTable.status, status as any));
  if (query) {
    conditions.push(
      or(
        ilike(placesTable.title, `%${query}%`),
        ilike(placesTable.district, `%${query}%`),
      )!
    );
  }

  const rows = await db
    .select({
      place: placesTable,
      submitterName: profilesTable.name,
    })
    .from(placesTable)
    .leftJoin(profilesTable, eq(placesTable.submittedBy, profilesTable.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(placesTable.createdAt))
    .limit(pageSize);

  res.json(rows.map((r) => ({ ...r.place, submitterName: r.submitterName })));
});

// GET /admin/places/:id — get single place for admin editing
router.get("/places/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [place] = await db.select().from(placesTable).where(eq(placesTable.id, id));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }
  res.json(place);
});

// PATCH /admin/places/:id — admin can update any field on any place
router.patch("/places/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [place] = await db.select({ id: placesTable.id }).from(placesTable).where(eq(placesTable.id, id));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  const {
    title, shortDescription, description, history,
    categorySlug, district, province, lat, lng,
    coverImage, images, hidden, featured,
    bestSeason, difficulty, costEstimate, permits, durationDays,
    nearbyHospital, emergency, localSupport, status,
  } = req.body;
  const imageFields = adminPlaceImageFieldsSchema.safeParse({ coverImage, images });
  if (!imageFields.success) {
    res.status(400).json({
      error: { code: "validation_error", message: "Images must be valid stored image paths" },
    });
    return;
  }

  try {
    await verifyStoredPlaceImages([
      imageFields.data.coverImage,
      ...(imageFields.data.images ?? []),
    ]);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(400).json({
        error: { code: "invalid_image", message: "One or more uploaded images were not found in storage" },
      });
      return;
    }
    throw error;
  }

  const updateData: Record<string, any> = {};
  if (title != null) updateData.title = title;
  if (shortDescription != null) updateData.shortDescription = shortDescription;
  if (description != null) updateData.description = description;
  if (history != null) updateData.history = history;
  if (categorySlug != null) updateData.categorySlug = categorySlug;
  if (district != null) updateData.district = district;
  if (province != null) updateData.province = province;
  if (lat != null) updateData.lat = String(lat);
  if (lng != null) updateData.lng = String(lng);
  if (imageFields.data.coverImage !== undefined) updateData.coverImage = imageFields.data.coverImage;
  if (imageFields.data.images !== undefined) updateData.images = imageFields.data.images;
  if (hidden != null) updateData.hidden = hidden;
  if (featured != null) updateData.featured = featured;
  if (bestSeason != null) updateData.bestSeason = bestSeason;
  if (difficulty != null) updateData.difficulty = difficulty;
  if (costEstimate != null) updateData.costEstimate = costEstimate;
  if (permits != null) updateData.permits = permits;
  if (durationDays != null) updateData.durationDays = Number(durationDays);
  if (nearbyHospital != null) updateData.nearbyHospital = nearbyHospital;
  if (emergency != null) updateData.emergency = emergency;
  if (localSupport != null) updateData.localSupport = localSupport;
  if (status != null) updateData.status = status;

  const [updated] = await db.update(placesTable).set(updateData).where(eq(placesTable.id, id)).returning();
  req.log.info({ placeId: id, adminId: req.user!.sub }, "Admin updated place");
  res.json(updated);
});

// DELETE /admin/places/:id — hard delete a place (cascades to submissions)
router.delete("/places/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [place] = await db.select({ id: placesTable.id, title: placesTable.title }).from(placesTable).where(eq(placesTable.id, id));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }
  await db.delete(placesTable).where(eq(placesTable.id, id));
  req.log.info({ placeId: id, adminId: req.user!.sub }, "Admin deleted place");
  res.sendStatus(204);
});

// Stats
router.get("/stats", async (req, res): Promise<void> => {
  const [totalPlaces] = await db.select({ count: count() }).from(placesTable);
  const [pendingSubs] = await db.select({ count: count() }).from(submissionsTable).where(eq(submissionsTable.status, "pending"));
  const [totalUsers] = await db.select({ count: count() }).from(usersTable);
  const [approvedPlaces] = await db.select({ count: count() }).from(placesTable).where(eq(placesTable.status, "approved"));
  const [openReports] = await db.select({ count: count() }).from(reportsTable).where(eq(reportsTable.resolved, false));

  const byStatus = await db
    .select({ status: placesTable.status, count: count() })
    .from(placesTable)
    .groupBy(placesTable.status);

  const topContributors = await db
    .select({ name: profilesTable.name, count: profilesTable.contributionsCount })
    .from(profilesTable)
    .orderBy(desc(profilesTable.contributionsCount))
    .limit(5);

  res.json({
    totalPlaces: totalPlaces.count,
    pendingSubmissions: pendingSubs.count,
    totalUsers: totalUsers.count,
    approvedPlaces: approvedPlaces.count,
    openReports: openReports.count,
    placesByStatus: byStatus,
    topContributors,
  });
});

export default router;

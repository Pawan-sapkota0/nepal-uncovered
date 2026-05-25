import { Router, type IRouter } from "express";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { db, placesTable, submissionsTable, usersTable, profilesTable, userRolesTable, reportsTable, categoriesTable } from "@workspace/db";
import { authenticate } from "../middlewares/authenticate";
import { requireRole, requireMinRole } from "../middlewares/requireRole";
import { sendApprovedEmail, sendRejectedEmail, sendChangesRequestedEmail } from "../lib/email";

const router: IRouter = Router();

// All admin routes require authentication + at least moderator
router.use(authenticate, requireMinRole("moderator"));

// Submissions management
router.get("/submissions", async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const rows = await db
    .select({
      submission: submissionsTable,
      place: { id: placesTable.id, slug: placesTable.slug, title: placesTable.title, status: placesTable.status },
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

// Places management
router.patch("/places/:id", requireRole("admin", "moderator"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { featured, status, title, shortDescription, description } = req.body;

  const updateData: any = {};
  if (featured != null) updateData.featured = featured;
  if (status != null) updateData.status = status;
  if (title != null) updateData.title = title;
  if (shortDescription != null) updateData.shortDescription = shortDescription;
  if (description != null) updateData.description = description;

  const [updated] = await db.update(placesTable).set(updateData).where(eq(placesTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }
  res.json(updated);
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

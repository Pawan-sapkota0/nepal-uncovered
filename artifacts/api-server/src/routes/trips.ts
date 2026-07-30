import { Router } from "express";
import { db } from "@workspace/db";
import {
  tripsTable, tripPlacesTable, placesTable,
  tripDaysTable, tripDayActivitiesTable, tripChecklistsTable,
} from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";
import { z } from "zod/v4";

const router = Router();
router.use(authenticate);

// ────────────────────────────────────────────────────────────────
// Helper: verify trip ownership
// ────────────────────────────────────────────────────────────────
async function ownedTrip(tripId: string, userId: string) {
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(and(eq(tripsTable.id, tripId), eq(tripsTable.userId, userId)));
  return trip ?? null;
}

// ────────────────────────────────────────────────────────────────
// TRIPS
// ────────────────────────────────────────────────────────────────

router.get("/trips", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.userId, userId))
    .orderBy(asc(tripsTable.createdAt));

  const counts: Record<string, number> = {};
  for (const t of rows) {
    const places = await db.select({ id: tripPlacesTable.id }).from(tripPlacesTable).where(eq(tripPlacesTable.tripId, t.id));
    counts[t.id] = places.length;
  }

  res.json(rows.map((t) => ({ ...t, placeCount: counts[t.id] ?? 0 })));
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tripType: z.enum(["trekking", "adventure", "cultural", "family", "solo", "road_trip", "wildlife", "pilgrimage", "photography", "other"]).optional(),
  estimatedBudget: z.string().optional().nullable(),
  numTravelers: z.number().int().min(1).optional(),
  emergencyContact: z.string().max(500).optional().nullable(),
  status: z.enum(["planning", "upcoming", "ongoing", "completed", "cancelled"]).optional(),
  estimatedDays: z.number().int().min(1).optional().nullable(),
  destinations: z.array(z.string()).optional(),
  importantDocuments: z.array(z.object({ name: z.string(), description: z.string().optional() })).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

router.post("/trips", async (req, res): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }
  const [trip] = await db.insert(tripsTable).values({ userId: req.user!.sub, ...parsed.data }).returning();
  res.status(201).json(trip);
});

router.get("/trips/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const items = await db
    .select({ tripPlace: tripPlacesTable, place: placesTable })
    .from(tripPlacesTable)
    .innerJoin(placesTable, eq(tripPlacesTable.placeId, placesTable.id))
    .where(eq(tripPlacesTable.tripId, trip.id))
    .orderBy(asc(tripPlacesTable.sortOrder));

  res.json({ ...trip, places: items });
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  tripType: z.enum(["trekking", "adventure", "cultural", "family", "solo", "road_trip", "wildlife", "pilgrimage", "photography", "other"]).optional().nullable(),
  estimatedBudget: z.string().optional().nullable(),
  numTravelers: z.number().int().min(1).optional(),
  emergencyContact: z.string().max(500).optional().nullable(),
  status: z.enum(["planning", "upcoming", "ongoing", "completed", "cancelled"]).optional(),
  estimatedDays: z.number().int().min(1).optional().nullable(),
  destinations: z.array(z.string()).optional(),
  importantDocuments: z.array(z.object({ name: z.string(), description: z.string().optional() })).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

router.patch("/trips/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const [updated] = await db.update(tripsTable).set(parsed.data).where(eq(tripsTable.id, trip.id)).returning();
  res.json(updated);
});

router.delete("/trips/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }
  await db.delete(tripsTable).where(eq(tripsTable.id, trip.id));
  res.status(204).send();
});

// ────────────────────────────────────────────────────────────────
// PLACES on a trip (unchanged from before)
// ────────────────────────────────────────────────────────────────

const addPlaceSchema = z.object({
  placeId: z.string().uuid(),
  notes: z.string().max(500).optional(),
  visitDate: z.string().optional(),
});

router.post("/trips/:id/places", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = addPlaceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: { code: "validation", message: "Invalid body" } }); return; }

  const existing = await db.select({ id: tripPlacesTable.id }).from(tripPlacesTable).where(eq(tripPlacesTable.tripId, trip.id));
  const [item] = await db.insert(tripPlacesTable).values({ tripId: trip.id, sortOrder: existing.length, ...parsed.data }).returning();
  res.status(201).json(item);
});

const updatePlaceSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
  visitDate: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

router.patch("/trips/:id/places/:itemId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = updatePlaceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: { code: "validation", message: "Invalid body" } }); return; }

  const [updated] = await db
    .update(tripPlacesTable).set(parsed.data)
    .where(and(eq(tripPlacesTable.id, req.params.itemId as string), eq(tripPlacesTable.tripId, trip.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: { code: "not_found", message: "Item not found" } }); return; }
  res.json(updated);
});

router.delete("/trips/:id/places/:itemId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }
  await db.delete(tripPlacesTable).where(and(eq(tripPlacesTable.id, req.params.itemId as string), eq(tripPlacesTable.tripId, trip.id)));
  res.status(204).send();
});

// ────────────────────────────────────────────────────────────────
// TRIP DAYS
// ────────────────────────────────────────────────────────────────

router.get("/trips/:id/days", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const days = await db
    .select()
    .from(tripDaysTable)
    .where(eq(tripDaysTable.tripId, trip.id))
    .orderBy(asc(tripDaysTable.dayNumber));

  // attach activities to each day
  const result = await Promise.all(
    days.map(async (day) => {
      const activities = await db
        .select()
        .from(tripDayActivitiesTable)
        .where(eq(tripDayActivitiesTable.tripDayId, day.id))
        .orderBy(asc(tripDayActivitiesTable.sortOrder));
      return { ...day, activities };
    })
  );

  res.json(result);
});

const createDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string().optional().nullable(),
  wakeUpTime: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

router.post("/trips/:id/days", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = createDaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const [day] = await db.insert(tripDaysTable).values({ tripId: trip.id, ...parsed.data }).returning();
  res.status(201).json({ ...day, activities: [] });
});

const updateDaySchema = z.object({
  date: z.string().optional().nullable(),
  wakeUpTime: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

router.patch("/trips/:id/days/:dayId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = updateDaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const [updated] = await db
    .update(tripDaysTable).set(parsed.data)
    .where(and(eq(tripDaysTable.id, req.params.dayId as string), eq(tripDaysTable.tripId, trip.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: { code: "not_found", message: "Day not found" } }); return; }

  const activities = await db
    .select().from(tripDayActivitiesTable)
    .where(eq(tripDayActivitiesTable.tripDayId, updated.id))
    .orderBy(asc(tripDayActivitiesTable.sortOrder));

  res.json({ ...updated, activities });
});

router.delete("/trips/:id/days/:dayId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }
  await db.delete(tripDaysTable).where(and(eq(tripDaysTable.id, req.params.dayId as string), eq(tripDaysTable.tripId, trip.id)));
  res.status(204).send();
});

// ────────────────────────────────────────────────────────────────
// ACTIVITIES within a day
// ────────────────────────────────────────────────────────────────

const activityCategoryValues = ["breakfast", "morning_activity", "lunch", "afternoon_activity", "snacks", "dinner", "accommodation", "transportation", "miscellaneous"] as const;

const createActivitySchema = z.object({
  category: z.enum(activityCategoryValues),
  time: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  cost: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

// Ensure day belongs to the trip
async function ownedDay(dayId: string, tripId: string) {
  const [day] = await db
    .select()
    .from(tripDaysTable)
    .where(and(eq(tripDaysTable.id, dayId), eq(tripDaysTable.tripId, tripId)));
  return day ?? null;
}

router.get("/trips/:id/days/:dayId/activities", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const day = await ownedDay(req.params.dayId as string, trip.id);
  if (!day) { res.status(404).json({ error: { code: "not_found", message: "Day not found" } }); return; }

  const activities = await db
    .select().from(tripDayActivitiesTable)
    .where(eq(tripDayActivitiesTable.tripDayId, day.id))
    .orderBy(asc(tripDayActivitiesTable.sortOrder));

  res.json(activities);
});

router.post("/trips/:id/days/:dayId/activities", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const day = await ownedDay(req.params.dayId as string, trip.id);
  if (!day) { res.status(404).json({ error: { code: "not_found", message: "Day not found" } }); return; }

  const parsed = createActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  if (parsed.data.sortOrder === undefined) {
    const existing = await db.select({ id: tripDayActivitiesTable.id }).from(tripDayActivitiesTable).where(eq(tripDayActivitiesTable.tripDayId, day.id));
    parsed.data.sortOrder = existing.length;
  }

  const [activity] = await db
    .insert(tripDayActivitiesTable)
    .values({ tripDayId: day.id, ...parsed.data })
    .returning();
  res.status(201).json(activity);
});

const updateActivitySchema = z.object({
  category: z.enum(activityCategoryValues).optional(),
  time: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  cost: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

router.patch("/trips/:id/days/:dayId/activities/:activityId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const day = await ownedDay(req.params.dayId as string, trip.id);
  if (!day) { res.status(404).json({ error: { code: "not_found", message: "Day not found" } }); return; }

  const parsed = updateActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const [updated] = await db
    .update(tripDayActivitiesTable).set(parsed.data)
    .where(and(eq(tripDayActivitiesTable.id, req.params.activityId as string), eq(tripDayActivitiesTable.tripDayId, day.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: { code: "not_found", message: "Activity not found" } }); return; }
  res.json(updated);
});

router.delete("/trips/:id/days/:dayId/activities/:activityId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const day = await ownedDay(req.params.dayId as string, trip.id);
  if (!day) { res.status(404).json({ error: { code: "not_found", message: "Day not found" } }); return; }

  await db.delete(tripDayActivitiesTable).where(and(eq(tripDayActivitiesTable.id, req.params.activityId as string), eq(tripDayActivitiesTable.tripDayId, day.id)));
  res.status(204).send();
});

// ────────────────────────────────────────────────────────────────
// BUDGET SUMMARY
// ────────────────────────────────────────────────────────────────

router.get("/trips/:id/budget", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  // Get all activities for this trip via join
  const activities = await db
    .select({
      category: tripDayActivitiesTable.category,
      cost: tripDayActivitiesTable.cost,
      dayNumber: tripDaysTable.dayNumber,
    })
    .from(tripDayActivitiesTable)
    .innerJoin(tripDaysTable, eq(tripDayActivitiesTable.tripDayId, tripDaysTable.id))
    .where(eq(tripDaysTable.tripId, trip.id));

  // Calculate totals by category
  const categoryTotals: Record<string, number> = {};
  let totalCost = 0;
  for (const a of activities) {
    const cost = parseFloat(a.cost ?? "0") || 0;
    categoryTotals[a.category] = (categoryTotals[a.category] ?? 0) + cost;
    totalCost += cost;
  }

  // Daily totals
  const dayTotals: Record<number, number> = {};
  for (const a of activities) {
    const cost = parseFloat(a.cost ?? "0") || 0;
    dayTotals[a.dayNumber] = (dayTotals[a.dayNumber] ?? 0) + cost;
  }

  const estimatedBudget = parseFloat(trip.estimatedBudget ?? "0") || 0;

  res.json({
    estimatedBudget,
    totalPlannedCost: totalCost,
    budgetRemaining: estimatedBudget - totalCost,
    categoryTotals: {
      accommodation: categoryTotals["accommodation"] ?? 0,
      food: (categoryTotals["breakfast"] ?? 0) + (categoryTotals["lunch"] ?? 0) + (categoryTotals["dinner"] ?? 0) + (categoryTotals["snacks"] ?? 0),
      transportation: categoryTotals["transportation"] ?? 0,
      activities: (categoryTotals["morning_activity"] ?? 0) + (categoryTotals["afternoon_activity"] ?? 0),
      miscellaneous: categoryTotals["miscellaneous"] ?? 0,
    },
    dayTotals,
  });
});

// ────────────────────────────────────────────────────────────────
// CHECKLIST
// ────────────────────────────────────────────────────────────────

router.get("/trips/:id/checklist", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const items = await db
    .select()
    .from(tripChecklistsTable)
    .where(eq(tripChecklistsTable.tripId, trip.id))
    .orderBy(asc(tripChecklistsTable.sortOrder));
  res.json(items);
});

const createChecklistSchema = z.object({
  item: z.string().min(1).max(500),
  isChecked: z.boolean().optional(),
  category: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

router.post("/trips/:id/checklist", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = createChecklistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  if (parsed.data.sortOrder === undefined) {
    const existing = await db.select({ id: tripChecklistsTable.id }).from(tripChecklistsTable).where(eq(tripChecklistsTable.tripId, trip.id));
    parsed.data.sortOrder = existing.length;
  }

  const [item] = await db.insert(tripChecklistsTable).values({ tripId: trip.id, ...parsed.data }).returning();
  res.status(201).json(item);
});

const updateChecklistSchema = z.object({
  item: z.string().min(1).max(500).optional(),
  isChecked: z.boolean().optional(),
  category: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

router.patch("/trips/:id/checklist/:itemId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = updateChecklistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  const [updated] = await db
    .update(tripChecklistsTable).set(parsed.data)
    .where(and(eq(tripChecklistsTable.id, req.params.itemId as string), eq(tripChecklistsTable.tripId, trip.id)))
    .returning();
  if (!updated) { res.status(404).json({ error: { code: "not_found", message: "Item not found" } }); return; }
  res.json(updated);
});

router.delete("/trips/:id/checklist/:itemId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }
  await db.delete(tripChecklistsTable).where(and(eq(tripChecklistsTable.id, req.params.itemId as string), eq(tripChecklistsTable.tripId, trip.id)));
  res.status(204).send();
});

// Bulk replace checklist (used for seeding default packing list)
router.put("/trips/:id/checklist", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const trip = await ownedTrip(req.params.id as string, userId);
  if (!trip) { res.status(404).json({ error: { code: "not_found", message: "Trip not found" } }); return; }

  const parsed = z.array(createChecklistSchema).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: parsed.error.message } });
    return;
  }

  await db.delete(tripChecklistsTable).where(eq(tripChecklistsTable.tripId, trip.id));

  if (parsed.data.length > 0) {
    await db.insert(tripChecklistsTable).values(
      parsed.data.map((item, idx) => ({ tripId: trip.id, ...item, sortOrder: item.sortOrder ?? idx }))
    );
  }

  const items = await db.select().from(tripChecklistsTable).where(eq(tripChecklistsTable.tripId, trip.id)).orderBy(asc(tripChecklistsTable.sortOrder));
  res.json(items);
});

export default router;

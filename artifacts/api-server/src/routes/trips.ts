import { Router } from "express";
import { db } from "@workspace/db";
import { tripsTable, tripPlacesTable, placesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { authenticate } from "../middlewares/authenticate";
import { z } from "zod/v4";

const router = Router();

router.use(authenticate);

// ── List user's trips ──────────────────────────────────────────────────────
router.get("/trips", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.userId, userId))
    .orderBy(asc(tripsTable.createdAt));

  // get place counts per trip
  const counts: Record<string, number> = {};
  for (const t of rows) {
    const places = await db
      .select({ id: tripPlacesTable.id })
      .from(tripPlacesTable)
      .where(eq(tripPlacesTable.tripId, t.id));
    counts[t.id] = places.length;
  }

  res.json(rows.map((t) => ({ ...t, placeCount: counts[t.id] ?? 0 })));
});

// ── Create trip ────────────────────────────────────────────────────────────
const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.post("/trips", async (req, res): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: "Invalid body" } });
    return;
  }
  const [trip] = await db
    .insert(tripsTable)
    .values({ userId: req.user!.sub, ...parsed.data })
    .returning();
  res.status(201).json(trip);
});

// ── Get trip (with places) ─────────────────────────────────────────────────
router.get("/trips/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(and(eq(tripsTable.id, req.params.id), eq(tripsTable.userId, userId)));

  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }

  const items = await db
    .select({
      tripPlace: tripPlacesTable,
      place: placesTable,
    })
    .from(tripPlacesTable)
    .innerJoin(placesTable, eq(tripPlacesTable.placeId, placesTable.id))
    .where(eq(tripPlacesTable.tripId, trip.id))
    .orderBy(asc(tripPlacesTable.sortOrder));

  res.json({ ...trip, places: items });
});

// ── Update trip metadata ───────────────────────────────────────────────────
const updateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

router.patch("/trips/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: "Invalid body" } });
    return;
  }

  const [trip] = await db
    .select({ id: tripsTable.id })
    .from(tripsTable)
    .where(and(eq(tripsTable.id, req.params.id), eq(tripsTable.userId, userId)));

  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }

  const [updated] = await db
    .update(tripsTable)
    .set(parsed.data)
    .where(eq(tripsTable.id, req.params.id))
    .returning();

  res.json(updated);
});

// ── Delete trip ────────────────────────────────────────────────────────────
router.delete("/trips/:id", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [trip] = await db
    .select({ id: tripsTable.id })
    .from(tripsTable)
    .where(and(eq(tripsTable.id, req.params.id), eq(tripsTable.userId, userId)));

  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }

  await db.delete(tripsTable).where(eq(tripsTable.id, req.params.id));
  res.status(204).send();
});

// ── Add place to trip ──────────────────────────────────────────────────────
const addPlaceSchema = z.object({
  placeId: z.string().uuid(),
  notes: z.string().max(500).optional(),
  visitDate: z.string().optional(),
});

router.post("/trips/:id/places", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [trip] = await db
    .select({ id: tripsTable.id })
    .from(tripsTable)
    .where(and(eq(tripsTable.id, req.params.id), eq(tripsTable.userId, userId)));

  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }

  const parsed = addPlaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: "Invalid body" } });
    return;
  }

  // get next order
  const existing = await db
    .select({ id: tripPlacesTable.id })
    .from(tripPlacesTable)
    .where(eq(tripPlacesTable.tripId, trip.id));

  const [item] = await db
    .insert(tripPlacesTable)
    .values({ tripId: trip.id, sortOrder: existing.length, ...parsed.data })
    .returning();

  res.status(201).json(item);
});

// ── Update trip place (notes / visitDate) ─────────────────────────────────
const updatePlaceSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
  visitDate: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

router.patch("/trips/:id/places/:itemId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [trip] = await db
    .select({ id: tripsTable.id })
    .from(tripsTable)
    .where(and(eq(tripsTable.id, req.params.id), eq(tripsTable.userId, userId)));

  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }

  const parsed = updatePlaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation", message: "Invalid body" } });
    return;
  }

  const [updated] = await db
    .update(tripPlacesTable)
    .set(parsed.data)
    .where(and(eq(tripPlacesTable.id, req.params.itemId), eq(tripPlacesTable.tripId, trip.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: { code: "not_found", message: "Item not found" } });
    return;
  }

  res.json(updated);
});

// ── Remove place from trip ─────────────────────────────────────────────────
router.delete("/trips/:id/places/:itemId", async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const [trip] = await db
    .select({ id: tripsTable.id })
    .from(tripsTable)
    .where(and(eq(tripsTable.id, req.params.id), eq(tripsTable.userId, userId)));

  if (!trip) {
    res.status(404).json({ error: { code: "not_found", message: "Trip not found" } });
    return;
  }

  await db
    .delete(tripPlacesTable)
    .where(and(eq(tripPlacesTable.id, req.params.itemId), eq(tripPlacesTable.tripId, trip.id)));

  res.status(204).send();
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, bookmarksTable, placesTable } from "@workspace/db";
import { authenticate } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/bookmarks", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await db
    .select({ place: placesTable })
    .from(bookmarksTable)
    .innerJoin(placesTable, eq(bookmarksTable.placeId, placesTable.id))
    .where(eq(bookmarksTable.userId, userId));
  res.json(rows.map((r) => ({ ...r.place, bookmarked: true })));
});

router.post("/bookmarks", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const { placeId } = req.body;
  if (!placeId) {
    res.status(400).json({ error: { code: "validation_error", message: "placeId required" } });
    return;
  }

  const [place] = await db.select({ id: placesTable.id }).from(placesTable).where(eq(placesTable.id, placeId));
  if (!place) {
    res.status(404).json({ error: { code: "not_found", message: "Place not found" } });
    return;
  }

  const [existing] = await db.select().from(bookmarksTable)
    .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.placeId, placeId)));
  if (existing) {
    res.status(409).json({ error: { code: "already_bookmarked", message: "Already bookmarked" } });
    return;
  }

  const [bm] = await db.insert(bookmarksTable).values({ userId, placeId }).returning();
  res.status(201).json(bm);
});

router.delete("/bookmarks/:placeId", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const placeId = Array.isArray(req.params.placeId) ? req.params.placeId[0] : req.params.placeId;
  await db.delete(bookmarksTable).where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.placeId, placeId)));
  res.sendStatus(204);
});

export default router;

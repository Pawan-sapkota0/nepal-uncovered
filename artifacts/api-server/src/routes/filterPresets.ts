import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, filterPresetsTable } from "@workspace/db";
import { authenticate } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/filter-presets", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await db.select().from(filterPresetsTable).where(eq(filterPresetsTable.userId, userId));
  res.json(rows);
});

router.post("/filter-presets", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const { name, filters } = req.body;
  if (!name || !filters) {
    res.status(400).json({ error: { code: "validation_error", message: "name and filters required" } });
    return;
  }
  const [preset] = await db.insert(filterPresetsTable).values({ userId, name, filters }).returning();
  res.status(201).json(preset);
});

router.delete("/filter-presets/:id", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(filterPresetsTable)
    .where(and(eq(filterPresetsTable.id, id), eq(filterPresetsTable.userId, userId)));
  res.sendStatus(204);
});

export default router;

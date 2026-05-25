import { Router, type IRouter } from "express";
import { db, reportsTable } from "@workspace/db";
import { authenticate } from "../middlewares/authenticate";
import { z } from "zod";

const router: IRouter = Router();

const reportSchema = z.object({
  placeId: z.string().uuid(),
  reason: z.enum(["inaccurate", "unsafe", "spam", "duplicate", "offensive", "other"]),
  details: z.string().optional(),
});

router.post("/reports", authenticate, async (req, res): Promise<void> => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "validation_error", message: parsed.error.message } });
    return;
  }
  const [report] = await db.insert(reportsTable).values({
    ...parsed.data, reporterId: req.user!.sub,
  }).returning();
  res.status(201).json(report);
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, submissionsTable, placesTable } from "@workspace/db";
import { authenticate } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/me/submissions", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.sub;
  const rows = await db
    .select({ submission: submissionsTable, place: placesTable })
    .from(submissionsTable)
    .innerJoin(placesTable, eq(submissionsTable.placeId, placesTable.id))
    .where(eq(submissionsTable.userId, userId));
  res.json(rows.map((r) => ({ ...r.submission, place: r.place })));
});

export default router;

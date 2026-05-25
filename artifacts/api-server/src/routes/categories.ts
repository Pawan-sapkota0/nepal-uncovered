import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable, placesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/categories", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      slug: categoriesTable.slug,
      name: categoriesTable.name,
      description: categoriesTable.description,
      icon: categoriesTable.icon,
      sortOrder: categoriesTable.sortOrder,
      count: sql<number>`count(${placesTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(placesTable, eq(categoriesTable.slug, placesTable.categorySlug))
    .groupBy(categoriesTable.slug)
    .orderBy(categoriesTable.sortOrder);

  res.json(rows);
});

export default router;

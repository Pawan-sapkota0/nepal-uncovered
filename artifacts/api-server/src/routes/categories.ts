import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable, placesTable } from "@workspace/db";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.get("/categories", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      slug: categoriesTable.slug,
      name: categoriesTable.name,
      description: categoriesTable.description,
      icon: categoriesTable.icon,
      coverImage: categoriesTable.coverImage,
      sortOrder: categoriesTable.sortOrder,
      count: sql<number>`count(${placesTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(placesTable, eq(categoriesTable.slug, placesTable.categorySlug))
    .groupBy(categoriesTable.slug)
    .orderBy(categoriesTable.sortOrder);

  res.json(rows);
});

// Category covers are public presentation assets. The database stores only the
// object path; this endpoint streams the bytes from App Storage.
router.get("/categories/:slug/cover", async (req: Request, res: Response): Promise<void> => {
  const [category] = await db
    .select({ coverImage: categoriesTable.coverImage })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, String(req.params.slug)));

  if (!category?.coverImage) {
    res.status(404).json({ error: "Category cover image not found" });
    return;
  }

  try {
    const file = await objectStorageService.getObjectEntityFile(category.coverImage);
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Category cover image not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving category cover image");
    res.status(500).json({ error: "Failed to serve category cover image" });
  }
});

export default router;

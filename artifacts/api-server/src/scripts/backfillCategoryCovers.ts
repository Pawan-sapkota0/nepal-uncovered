import { eq, isNull } from "drizzle-orm";
import { db, categoriesTable, placesTable } from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const objectStorageService = new ObjectStorageService();

async function downloadSource(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
  });

  if (!response.ok) {
    throw new Error(`Source returned ${response.status}: ${url}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Source is not an image (${contentType || "unknown content type"}): ${url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(`Source image size is invalid (${bytes.length} bytes): ${url}`);
  }

  return { bytes, contentType };
}

async function uploadToAppStorage(bytes: Buffer, contentType: string): Promise<string> {
  const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
    signal: AbortSignal.timeout(60_000),
  });

  if (!uploadResponse.ok) {
    throw new Error(`App Storage upload failed with ${uploadResponse.status}`);
  }

  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadUrl);
  const storedFile = await objectStorageService.getObjectEntityFile(objectPath);
  const [metadata] = await storedFile.getMetadata();
  if (Number(metadata.size ?? 0) !== bytes.length) {
    throw new Error(`Stored object size mismatch for ${objectPath}`);
  }

  return objectPath;
}

async function downloadFromCandidates(candidates: string[]): Promise<{
  bytes: Buffer;
  contentType: string;
  sourceUrl: string;
}> {
  let lastError: unknown;
  for (const sourceUrl of [...new Set(candidates)]) {
    try {
      return { ...(await downloadSource(sourceUrl)), sourceUrl };
    } catch (error) {
      lastError = error;
      console.warn(`[category-cover-backfill] source unavailable: ${sourceUrl}`);
    }
  }
  throw lastError ?? new Error("No category cover source was available");
}

async function backfillCategoryCovers() {
  const [categories, places] = await Promise.all([
    db
      .select({ slug: categoriesTable.slug, name: categoriesTable.name, coverImage: categoriesTable.coverImage })
      .from(categoriesTable)
      .where(isNull(categoriesTable.coverImage)),
    db
      .select({ categorySlug: placesTable.categorySlug, coverImage: placesTable.coverImage })
      .from(placesTable),
  ]);

  const firstPlaceWithImage = places.find((place) => place.coverImage);
  if (!firstPlaceWithImage?.coverImage) {
    throw new Error("No existing place image is available for the category backfill");
  }

  let updated = 0;
  for (const category of categories) {
    const categoryPlace = places.find(
      (place) => place.categorySlug === category.slug && place.coverImage,
    );
    const sourceUrl = categoryPlace?.coverImage ?? firstPlaceWithImage.coverImage;

    if (!categoryPlace) {
      console.warn(
        `[category-cover-backfill] ${category.slug} has no place image; using ${firstPlaceWithImage.coverImage}`,
      );
    }

    const { bytes, contentType, sourceUrl: resolvedSourceUrl } =
      await downloadFromCandidates([sourceUrl, firstPlaceWithImage.coverImage]);
    if (resolvedSourceUrl !== sourceUrl) {
      console.warn(`[category-cover-backfill] ${category.slug} used fallback source ${resolvedSourceUrl}`);
    }
    const objectPath = await uploadToAppStorage(bytes, contentType);

    const [result] = await db
      .update(categoriesTable)
      .set({ coverImage: objectPath })
      .where(eq(categoriesTable.slug, category.slug))
      .returning({ slug: categoriesTable.slug });

    if (!result) {
      throw new Error(`Category disappeared during backfill: ${category.slug}`);
    }

    updated += 1;
    console.log(`[category-cover-backfill] ${category.slug} -> ${objectPath}`);
  }

  console.log(`[category-cover-backfill] updated ${updated} category covers`);
}

backfillCategoryCovers()
  .catch((error) => {
    console.error("[category-cover-backfill] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });
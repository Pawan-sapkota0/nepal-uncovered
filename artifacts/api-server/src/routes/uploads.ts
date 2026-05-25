import { Router, type IRouter } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requireMinRole } from "../middlewares/requireRole";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Stub: returns a presigned URL (in production this would be S3/R2)
router.post("/uploads/sign", authenticate, requireMinRole("contributor"), async (req, res): Promise<void> => {
  const { slug, contentType } = req.body;
  const userId = req.user!.sub;
  const fileId = randomUUID();
  const key = `place-images/${userId}/${slug ?? "unknown"}/${fileId}.jpg`;

  // In production: generate a real presigned PUT URL from S3/R2
  // For now return a stub that the frontend can reference
  res.json({
    uploadUrl: `https://storage.example.com/${key}?token=stub`,
    key,
    publicUrl: `https://storage.example.com/${key}`,
    expiresIn: 300,
  });
});

export default router;

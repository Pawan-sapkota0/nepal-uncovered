import { useState } from "react";
import { getAccessToken } from "@/lib/api";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/{2,}/g, "/");

export type UploadState = "idle" | "uploading" | "done" | "error";

export interface UploadedImage {
  objectPath: string;
  previewUrl: string;
  name: string;
}

export const DEFAULT_IMAGE_UPLOAD_RULES = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxBytes: 10 * 1024 * 1024,
  invalidTypeMessage: "Use a JPG, PNG, or WebP image",
  maxSizeMessage: "Images must be 10 MB or smaller",
};

export const PLACE_IMAGE_UPLOAD_RULES = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] as const,
  maxBytes: 8 * 1024 * 1024,
  invalidTypeMessage: "File must be an image",
  maxSizeMessage: "Image must be under 8MB",
};

export const PLACE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export type ImageUploadRules =
  | typeof DEFAULT_IMAGE_UPLOAD_RULES
  | typeof PLACE_IMAGE_UPLOAD_RULES;

export function validateImageFile(file: File, rules: ImageUploadRules): string | null {
  if (!rules.acceptedTypes.includes(file.type as never)) return rules.invalidTypeMessage;
  if (file.size > rules.maxBytes) return rules.maxSizeMessage;
  return null;
}

async function uploadOne(file: File, rules: ImageUploadRules): Promise<UploadedImage> {
  const validationError = validateImageFile(file, rules);
  if (validationError) {
    throw new Error(validationError);
  }

  const token = await getAccessToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const metaRes = await fetch(`${API_BASE}/storage/uploads/request-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? "Failed to get upload URL");
  }

  const { uploadURL, objectPath } = await metaRes.json();

  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!uploadRes.ok) throw new Error("Upload to storage failed");

  const confirmRes = await fetch(`${API_BASE}/storage/uploads/confirm`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath }),
  });
  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? (err as any)?.error ?? "Failed to confirm upload");
  }

  const previewUrl = URL.createObjectURL(file);
  return { objectPath, previewUrl, name: file.name };
}

export function useSingleImageUpload(rules: ImageUploadRules = DEFAULT_IMAGE_UPLOAD_RULES) {
  const [state, setState] = useState<UploadState>("idle");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setState("uploading");
    setError(null);
    try {
      const result = await uploadOne(file, rules);
      setImage(result);
      setState("done");
      return result;
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
      setState("error");
      return null;
    }
  };

  const clear = () => {
    if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    setImage(null);
    setState("idle");
    setError(null);
  };

  return { upload, clear, state, image, error };
}

export function useMultiImageUpload(max = 10, rules: ImageUploadRules = DEFAULT_IMAGE_UPLOAD_RULES) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | File[]): Promise<UploadedImage[] | null> => {
    const arr = Array.from(files);
    if (images.length + arr.length > max) {
      setError(`Maximum ${max} images allowed`);
      return null;
    }
    setUploading(true);
    setError(null);
    try {
      const results = await Promise.all(arr.map((file) => uploadOne(file, rules)));
      setImages((prev) => [...prev, ...results]);
      return results;
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = (objectPath: string) => {
    setImages((prev) => {
      const hit = prev.find((i) => i.objectPath === objectPath);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((i) => i.objectPath !== objectPath);
    });
  };

  const clear = () => {
    images.forEach((image) => {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
    });
    setImages([]);
    setUploading(false);
    setError(null);
  };

  return { upload, remove, clear, images, uploading, error };
}

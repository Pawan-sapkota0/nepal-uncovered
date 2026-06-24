import { useState } from "react";
import { getAccessToken } from "@/lib/api";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/{2,}/g, "/");

export type UploadState = "idle" | "uploading" | "done" | "error";

export interface UploadedImage {
  objectPath: string;
  previewUrl: string;
  name: string;
}

async function uploadOne(file: File): Promise<UploadedImage> {
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

  const previewUrl = URL.createObjectURL(file);
  return { objectPath, previewUrl, name: file.name };
}

export function useSingleImageUpload() {
  const [state, setState] = useState<UploadState>("idle");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setState("uploading");
    setError(null);
    try {
      const result = await uploadOne(file);
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

export function useMultiImageUpload(max = 10) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (images.length + arr.length > max) {
      setError(`Maximum ${max} images allowed`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const results = await Promise.all(arr.map(uploadOne));
      setImages((prev) => [...prev, ...results]);
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
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

  return { upload, remove, images, uploading, error };
}

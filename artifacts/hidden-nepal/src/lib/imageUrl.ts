const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/{2,}/g, "/");

export function getImageUrl(path: string | undefined | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}/storage${path}`;
}

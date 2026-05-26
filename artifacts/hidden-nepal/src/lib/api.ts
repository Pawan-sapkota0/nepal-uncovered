const BASE = `${import.meta.env.BASE_URL}api`.replace(/\/{2,}/g, "/");

let _accessToken: string | null = null;
let _refreshing: Promise<string | null> | null = null;

export function setAccessToken(t: string | null) { _accessToken = t; }
export function getAccessToken() { return _accessToken; }

async function doRefresh(): Promise<string | null> {
  try {
    const r = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!r.ok) { _accessToken = null; return null; }
    const data = await r.json();
    _accessToken = data.accessToken;
    return _accessToken;
  } catch {
    _accessToken = null;
    return null;
  }
}

async function getToken(): Promise<string | null> {
  if (_accessToken) return _accessToken;
  if (_refreshing) return _refreshing;
  _refreshing = doRefresh().finally(() => { _refreshing = null; });
  return _refreshing;
}

async function request<T>(
  path: string,
  opts: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: "include" });

  if (res.status === 401 && retry) {
    _accessToken = null;
    const fresh = await doRefresh();
    if (fresh) return request<T>(path, opts, false);
    throw new ApiError(401, "unauthorized");
  }

  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = {}; }
    throw new ApiError(res.status, body?.error?.code ?? "unknown", body?.error?.message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, msg?: string) {
    super(msg ?? code);
  }
}

// ──────────────── AUTH ────────────────
export interface MeResponse {
  id: string; email: string; name: string;
  bio?: string; avatarUrl?: string;
  contributionsCount: number; roles: string[];
  emailVerified: boolean; joinedAt: string;
}

export const auth = {
  signup: (email: string, password: string, name: string) =>
    request<{ accessToken: string; user: MeResponse }>("/auth/signup", {
      method: "POST", body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: MeResponse }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<MeResponse>("/auth/me"),
  updateProfile: (data: { name?: string; bio?: string }) =>
    request<void>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
};

// ──────────────── CATEGORIES ────────────────
export interface ApiCategory {
  slug: string; name: string; description?: string;
  icon?: string; sortOrder: number; count: number;
}

export const categories = {
  list: () => request<ApiCategory[]>("/categories"),
};

// ──────────────── PLACES ────────────────
export interface ApiPlace {
  id: string; slug: string; title: string;
  shortDescription: string; description: string;
  history?: string; categorySlug?: string;
  district: string; province: string;
  lat: string; lng: string;
  coverImage?: string; images: string[];
  hidden: boolean; featured: boolean; views: number;
  bestSeason?: string; difficulty?: string;
  costEstimate?: string; permits?: string; durationDays?: number;
  nearbyHospital?: string; emergency?: string; localSupport?: string;
  status: string; submittedBy?: string;
  createdAt: string; updatedAt: string;
  bookmarked?: boolean;
}

export interface PlacesParams {
  query?: string; category?: string; province?: string;
  district?: string; difficulty?: string; hidden?: boolean;
  sort?: string; cursor?: string; limit?: number;
}

export const places = {
  list: (params: PlacesParams = {}) => {
    const q = new URLSearchParams();
    if (params.query) q.set("query", params.query);
    if (params.category) q.set("category", params.category);
    if (params.province) q.set("province", params.province);
    if (params.district) q.set("district", params.district);
    if (params.difficulty) q.set("difficulty", params.difficulty);
    if (params.hidden) q.set("hidden", "true");
    if (params.sort) q.set("sort", params.sort);
    if (params.cursor) q.set("cursor", params.cursor);
    if (params.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{ data: ApiPlace[]; nextCursor: string | null; total: number }>(`/places${qs ? `?${qs}` : ""}`);
  },
  get: (slug: string) => request<ApiPlace>(`/places/${slug}`),
  recordView: (slug: string) => request<void>(`/places/${slug}/view`, { method: "POST" }),
  create: (data: Partial<ApiPlace>) =>
    request<ApiPlace>("/places", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ApiPlace>) =>
    request<ApiPlace>(`/places/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ──────────────── BOOKMARKS ────────────────
export const bookmarks = {
  list: () => request<ApiPlace[]>("/bookmarks"),
  add: (placeId: string) => request<void>("/bookmarks", { method: "POST", body: JSON.stringify({ placeId }) }),
  remove: (placeId: string) => request<void>(`/bookmarks/${placeId}`, { method: "DELETE" }),
};

// ──────────────── REVIEWS ────────────────
export interface ApiReview {
  id: string; placeId: string; userId: string;
  rating: number; body?: string;
  createdAt: string; updatedAt: string;
  reviewer?: { name?: string; avatarUrl?: string };
}

export const reviews = {
  list: (slug: string) => request<{ reviews: ApiReview[]; average: string | null; count: number }>(`/places/${slug}/reviews`),
  create: (data: { placeId: string; rating: number; body?: string }) =>
    request<ApiReview>("/reviews", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/reviews/${id}`, { method: "DELETE" }),
};

// ──────────────── REPORTS ────────────────
export const reports = {
  create: (data: { placeId: string; reason: string; details?: string }) =>
    request<void>("/reports", { method: "POST", body: JSON.stringify(data) }),
};

// ──────────────── FILTER PRESETS ────────────────
export interface ApiFilterPreset {
  id: string; name: string; filters: any; createdAt: string;
}

export const filterPresets = {
  list: () => request<ApiFilterPreset[]>("/filter-presets"),
  create: (name: string, filters: any) =>
    request<ApiFilterPreset>("/filter-presets", { method: "POST", body: JSON.stringify({ name, filters }) }),
  delete: (id: string) => request<void>(`/filter-presets/${id}`, { method: "DELETE" }),
};

// ──────────────── MY SUBMISSIONS ────────────────
export interface ApiSubmission {
  id: string; placeId: string; userId: string;
  status: string; feedback?: string;
  submittedAt: string; reviewedAt?: string;
  place: ApiPlace;
}

export const me = {
  submissions: () => request<ApiSubmission[]>("/me/submissions"),
};

// ──────────────── TRIPS ────────────────
export interface ApiTrip {
  id: string; userId: string; title: string;
  description?: string; startDate?: string; endDate?: string;
  createdAt: string; updatedAt: string;
  placeCount?: number;
}

export interface ApiTripPlace {
  tripPlace: {
    id: string; tripId: string; placeId: string;
    sortOrder: number; notes?: string; visitDate?: string;
    createdAt: string;
  };
  place: ApiPlace;
}

export interface ApiTripDetail extends ApiTrip {
  places: ApiTripPlace[];
}

export const trips = {
  list: () => request<ApiTrip[]>("/trips"),
  get: (id: string) => request<ApiTripDetail>(`/trips/${id}`),
  create: (data: { title: string; description?: string; startDate?: string; endDate?: string }) =>
    request<ApiTrip>("/trips", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; description?: string; startDate?: string | null; endDate?: string | null }) =>
    request<ApiTrip>(`/trips/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/trips/${id}`, { method: "DELETE" }),
  addPlace: (id: string, data: { placeId: string; notes?: string; visitDate?: string }) =>
    request<ApiTripPlace["tripPlace"]>(`/trips/${id}/places`, { method: "POST", body: JSON.stringify(data) }),
  updatePlace: (id: string, itemId: string, data: { notes?: string | null; visitDate?: string | null; sortOrder?: number }) =>
    request<ApiTripPlace["tripPlace"]>(`/trips/${id}/places/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
  removePlace: (id: string, itemId: string) =>
    request<void>(`/trips/${id}/places/${itemId}`, { method: "DELETE" }),
};

// ──────────────── ADMIN ────────────────
export interface AdminStats {
  totalPlaces: number; pendingSubmissions: number;
  totalUsers: number; approvedPlaces: number; openReports: number;
  placesByStatus: { status: string; count: number }[];
  topContributors: { name: string; count: number }[];
}

export interface AdminUser {
  id: string; email: string; name?: string;
  bio?: string; avatarUrl?: string;
  contributionsCount?: number; joinedAt?: string;
  createdAt: string; disabledAt?: string; roles: string[];
}

export interface AdminSubmission {
  submission: {
    id: string; placeId: string; userId: string;
    status: string; feedback?: string;
    submittedAt: string; reviewedAt?: string;
  };
  place: { id: string; slug: string; title: string; status: string };
  submitter: { name: string; email: string };
}

export const admin = {
  stats: () => request<AdminStats>("/admin/stats"),
  submissions: (status?: string) => {
    const qs = status ? `?status=${status}` : "";
    return request<AdminSubmission[]>(`/admin/submissions${qs}`);
  },
  approveSubmission: (id: string) =>
    request<void>(`/admin/submissions/${id}/approve`, { method: "POST" }),
  rejectSubmission: (id: string, feedback?: string) =>
    request<void>(`/admin/submissions/${id}/reject`, { method: "POST", body: JSON.stringify({ feedback }) }),
  requestChanges: (id: string, feedback: string) =>
    request<void>(`/admin/submissions/${id}/request-changes`, { method: "POST", body: JSON.stringify({ feedback }) }),
  users: () => request<AdminUser[]>("/admin/users"),
  updateUserRoles: (id: string, roles: string[]) =>
    request<void>(`/admin/users/${id}/roles`, { method: "PATCH", body: JSON.stringify({ roles }) }),
  updatePlace: (id: string, data: any) =>
    request<ApiPlace>(`/admin/places/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  reports: () => request<any[]>("/admin/reports"),
  resolveReport: (id: string) => request<void>(`/admin/reports/${id}/resolve`, { method: "PATCH" }),
};

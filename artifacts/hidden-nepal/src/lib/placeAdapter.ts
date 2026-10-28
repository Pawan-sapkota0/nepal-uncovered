import type { Place } from "@/types";
import type { ApiPlace } from "@/lib/api";

/**
 * Convert backend ApiPlace shape → frontend Place shape so all existing
 * components (PlaceCard, PlaceDetail, etc.) continue to work unchanged.
 */
export function adaptPlace(p: ApiPlace): Place {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    description: p.description,
    history: p.history ?? "",
    category: (p.categorySlug ?? "villages") as any,
    district: p.district,
    province: p.province as any,
    coordinates: [parseFloat(p.lat), parseFloat(p.lng)],
    coverImage: p.coverImage ?? `https://source.unsplash.com/800x600/?nepal,${p.categorySlug ?? "nature"}`,
    images: p.images ?? [],
    hidden: p.hidden,
    featured: p.featured,
    views: p.views,
    ratingAverage: Number(p.ratingAverage ?? 0),
    ratingCount: p.ratingCount ?? 0,
    travel: {
      bestSeason: p.bestSeason ?? "Year-round",
      difficulty: (p.difficulty ?? "Moderate") as any,
      costEstimate: p.costEstimate ?? "NPR varies",
      permits: p.permits ?? "Check locally",
      durationDays: p.durationDays ?? 1,
    },
    safety: {
      nearbyHospital: p.nearbyHospital ?? "See local guides",
      emergency: p.emergency ?? "Tourist Police: 1144",
      localSupport: p.localSupport ?? "Ask at your lodge",
    },
    status: (p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending") as any,
    submittedBy: p.submittedBy,
    createdAt: p.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

export function adaptPlaces(ps: ApiPlace[]): Place[] {
  return ps.map(adaptPlace);
}

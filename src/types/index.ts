export type Province =
  | "Koshi"
  | "Madhesh"
  | "Bagmati"
  | "Gandaki"
  | "Lumbini"
  | "Karnali"
  | "Sudurpashchim";

export type Difficulty = "Easy" | "Moderate" | "Challenging" | "Extreme";

export type CategorySlug =
  | "lakes"
  | "mountains"
  | "villages"
  | "heritage"
  | "wildlife"
  | "trekking"
  | "spiritual"
  | "valleys";

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  description: string;
  count?: number;
}

export interface Place {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  history: string;
  category: CategorySlug;
  district: string;
  province: Province;
  coordinates: [number, number]; // [lat, lng]
  coverImage: string;
  images: string[];
  hidden: boolean; // hidden gem flag
  featured?: boolean;
  views: number;
  travel: {
    bestSeason: string;
    difficulty: Difficulty;
    costEstimate: string; // NPR
    permits: string;
    durationDays: number;
  };
  safety: {
    nearbyHospital: string;
    emergency: string;
    localSupport: string;
  };
  status: "approved" | "pending" | "rejected";
  submittedBy?: string; // user id
  createdAt: string;
}

export type UserRole = "viewer" | "contributor" | "moderator" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  role: UserRole;
  joinedAt: string;
  contributions: number;
}

export interface Submission {
  id: string;
  placeId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
  submittedAt: string;
  reviewedAt?: string;
}

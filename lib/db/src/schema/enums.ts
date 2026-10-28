import { pgEnum } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["viewer", "contributor", "moderator", "admin"]);
export const provinceEnum = pgEnum("province", ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"]);
export const difficultyEnum = pgEnum("difficulty", ["Easy", "Moderate", "Challenging", "Extreme"]);
export const placeStatusEnum = pgEnum("place_status", ["draft", "pending", "approved", "rejected", "archived"]);
export const subStatusEnum = pgEnum("sub_status", ["pending", "approved", "rejected", "changes_requested"]);
export const reportReasonEnum = pgEnum("report_reason", ["inaccurate", "unsafe", "spam", "duplicate", "offensive", "other"]);
export const reviewStatusEnum = pgEnum("review_status", ["published", "hidden", "flagged"]);

export const tripTypeEnum = pgEnum("trip_type", ["trekking", "adventure", "cultural", "family", "solo", "road_trip", "wildlife", "pilgrimage", "photography", "other"]);
export const tripStatusEnum = pgEnum("trip_status", ["planning", "upcoming", "ongoing", "completed", "cancelled"]);
export const activityCategoryEnum = pgEnum("activity_category", ["breakfast", "morning_activity", "lunch", "afternoon_activity", "snacks", "dinner", "accommodation", "transportation", "miscellaneous"]);

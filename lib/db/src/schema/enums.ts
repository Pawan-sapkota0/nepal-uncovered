import { pgEnum } from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["viewer", "contributor", "moderator", "admin"]);
export const provinceEnum = pgEnum("province", ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"]);
export const difficultyEnum = pgEnum("difficulty", ["Easy", "Moderate", "Challenging", "Extreme"]);
export const placeStatusEnum = pgEnum("place_status", ["draft", "pending", "approved", "rejected", "archived"]);
export const subStatusEnum = pgEnum("sub_status", ["pending", "approved", "rejected", "changes_requested"]);
export const reportReasonEnum = pgEnum("report_reason", ["inaccurate", "unsafe", "spam", "duplicate", "offensive", "other"]);

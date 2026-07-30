import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, check, numeric, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { placesTable } from "./places";
import { reportReasonEnum, tripTypeEnum, tripStatusEnum, activityCategoryEnum } from "./enums";

export const bookmarksTable = pgTable("bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  placeId: uuid("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewsTable = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: uuid("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  check("rating_range", sql`${t.rating} between 1 and 5`),
]);

export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: uuid("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: reportReasonEnum("reason").notNull(),
  details: text("details"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const placeViewsTable = pgTable("place_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  placeId: uuid("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
  viewerId: uuid("viewer_id").references(() => usersTable.id, { onDelete: "set null" }),
  ipHash: text("ip_hash"),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const filterPresetsTable = pgTable("filter_presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ── Trip planner ──────────────────────────────────────────────────────────

export const tripsTable = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  // New fields
  tripType: tripTypeEnum("trip_type"),
  estimatedBudget: numeric("estimated_budget", { precision: 12, scale: 2 }),
  numTravelers: integer("num_travelers").notNull().default(1),
  emergencyContact: text("emergency_contact"),
  status: tripStatusEnum("trip_status").notNull().default("planning"),
  estimatedDays: integer("estimated_days"),
  destinations: text("destinations").array().notNull().default(sql`'{}'`),
  importantDocuments: jsonb("important_documents").notNull().default(sql`'[]'`),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tripPlacesTable = pgTable("trip_places", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  placeId: uuid("place_id").notNull().references(() => placesTable.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  visitDate: text("visit_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tripDaysTable = pgTable("trip_days", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  date: date("date", { mode: "string" }),
  wakeUpTime: text("wake_up_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tripDayActivitiesTable = pgTable("trip_day_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripDayId: uuid("trip_day_id").notNull().references(() => tripDaysTable.id, { onDelete: "cascade" }),
  category: activityCategoryEnum("category").notNull(),
  time: text("time"),
  description: text("description"),
  location: text("location"),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tripChecklistsTable = pgTable("trip_checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  isChecked: boolean("is_checked").notNull().default(false),
  category: text("category"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ── Insert schemas & types ────────────────────────────────────────────────

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTripPlaceSchema = createInsertSchema(tripPlacesTable).omit({ id: true, createdAt: true });
export const insertTripDaySchema = createInsertSchema(tripDaysTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTripDayActivitySchema = createInsertSchema(tripDayActivitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTripChecklistSchema = createInsertSchema(tripChecklistsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Trip = typeof tripsTable.$inferSelect;
export type TripPlace = typeof tripPlacesTable.$inferSelect;
export type TripDay = typeof tripDaysTable.$inferSelect;
export type TripDayActivity = typeof tripDayActivitiesTable.$inferSelect;
export type TripChecklist = typeof tripChecklistsTable.$inferSelect;

export const insertBookmarkSchema = createInsertSchema(bookmarksTable).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true, resolved: true });
export const insertFilterPresetSchema = createInsertSchema(filterPresetsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Bookmark = typeof bookmarksTable.$inferSelect;
export type Review = typeof reviewsTable.$inferSelect;
export type Report = typeof reportsTable.$inferSelect;
export type PlaceView = typeof placeViewsTable.$inferSelect;
export type FilterPreset = typeof filterPresetsTable.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

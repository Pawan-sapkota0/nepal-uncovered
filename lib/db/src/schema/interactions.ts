import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { placesTable } from "./places";
import { reportReasonEnum } from "./enums";

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

import { pgTable, uuid, text, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { provinceEnum, difficultyEnum, placeStatusEnum } from "./enums";
import { usersTable } from "./users";

export const categoriesTable = pgTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  coverImage: text("cover_image"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const placesTable = pgTable("places", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  history: text("history"),
  categorySlug: text("category_slug").references(() => categoriesTable.slug, { onDelete: "restrict" }),
  district: text("district").notNull(),
  province: provinceEnum("province").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  coverImage: text("cover_image"),
  images: text("images").array().notNull().default([]),
  hidden: boolean("hidden").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  views: integer("views").notNull().default(0),
  ratingAverage: numeric("rating_average", { precision: 3, scale: 2 }).notNull().default("0"),
  ratingCount: integer("rating_count").notNull().default(0),
  bestSeason: text("best_season"),
  difficulty: difficultyEnum("difficulty"),
  costEstimate: text("cost_estimate"),
  permits: text("permits"),
  durationDays: integer("duration_days"),
  nearbyHospital: text("nearby_hospital"),
  emergency: text("emergency"),
  localSupport: text("local_support"),
  status: placeStatusEnum("status").notNull().default("pending"),
  submittedBy: uuid("submitted_by").references(() => usersTable.id, { onDelete: "set null" }),
  approvedBy: uuid("approved_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ createdAt: true, updatedAt: true });
export const insertPlaceSchema = createInsertSchema(placesTable).omit({ id: true, createdAt: true, updatedAt: true, views: true });

export type Category = typeof categoriesTable.$inferSelect;
export type Place = typeof placesTable.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;

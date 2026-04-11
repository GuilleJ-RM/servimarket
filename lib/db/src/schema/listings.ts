import { pgTable, text, serial, timestamp, integer, boolean, real, jsonb, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("service"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().$type<number>(),
  imageUrl: text("image_url"),
  images: text("images").array().default([]),
  whatsapp: text("whatsapp"),
  paymentMethods: text("payment_methods").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  adminApproved: boolean("admin_approved").notNull().default(false),
  quantity: integer("quantity"),
  status: text("status").notNull().default("active"),
  pricingType: text("pricing_type").notNull().default("unit"),
  weightKg: real("weight_kg"),
  sizes: jsonb("sizes"),
  variantLabel: text("variant_label"),
  requiresSchedule: boolean("requires_schedule").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("listings_provider_id_idx").on(t.providerId),
  index("listings_category_id_idx").on(t.categoryId),
  index("listings_active_status_idx").on(t.isActive, t.status),
]);

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;

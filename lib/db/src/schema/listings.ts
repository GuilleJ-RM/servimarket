import { pgTable, text, serial, timestamp, integer, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("service"),
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  images: text("images").array().default([]), // Multiple images
  whatsapp: text("whatsapp"),
  paymentMethods: text("payment_methods").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  quantity: integer("quantity"), // For products: stock count (null = unlimited/service)
  status: text("status").notNull().default("active"), // active | sold | paused
  pricingType: text("pricing_type").notNull().default("unit"), // unit | per_kilo (legacy)
  weightKg: real("weight_kg"), // Available kg (legacy)
  sizes: jsonb("sizes"), // [{name: string, price: number, stock?: number}] variants
  variantLabel: text("variant_label"), // Label for variants: Talle, Tiempo, Superficie, Peso, etc.
  requiresSchedule: boolean("requires_schedule").notNull().default(false), // Provider decides if clients must pick date/time
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;

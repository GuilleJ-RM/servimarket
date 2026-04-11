import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { listingsTable } from "./listings";

// Bookings: for scheduling services or purchasing products
export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  providerId: integer("provider_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  notes: text("notes"),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("bookings_client_id_idx").on(t.clientId),
  index("bookings_provider_id_idx").on(t.providerId),
  index("bookings_status_idx").on(t.status),
  index("bookings_listing_id_idx").on(t.listingId),
]);

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

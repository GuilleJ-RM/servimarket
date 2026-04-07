import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("client"), // client | provider | admin | company
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  locality: text("locality"),
  whatsapp: text("whatsapp"),
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifyWhatsapp: boolean("notify_whatsapp").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),
  // Company fields (role = "company")
  companyName: text("company_name"),
  cuit: text("cuit"),
  companyAddress: text("company_address"),
  companyIndustry: text("company_industry"),
  companyApproved: boolean("company_approved").notNull().default(false),
  // CV fields (for clients)
  cvUrl: text("cv_url"),
  cvPublic: boolean("cv_public").notNull().default(false),
  cvCategories: jsonb("cv_categories").$type<number[] | "all">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

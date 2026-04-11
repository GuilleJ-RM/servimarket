import { pgTable, text, serial, timestamp, integer, boolean, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ── Job postings (vacantes) ─────────────────────────────────────────
export const jobPostingsTable = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  industry: text("industry"),
  locality: text("locality"),
  modality: text("modality").notNull().default("presencial"), // presencial | remoto | hibrido
  contractType: text("contract_type").notNull().default("full_time"), // full_time | part_time | freelance | pasantia
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  requirements: text("requirements"),
  benefits: text("benefits"),
  isActive: boolean("is_active").notNull().default(true),
  adminApproved: boolean("admin_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("job_postings_company_id_idx").on(t.companyId),
  index("job_postings_active_approved_idx").on(t.isActive, t.adminApproved),
]);

export const insertJobPostingSchema = createInsertSchema(jobPostingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobPosting = typeof jobPostingsTable.$inferSelect;

// ── Job questions (preguntas de filtro) ─────────────────────────────
export const jobQuestionsTable = pgTable("job_questions", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostingsTable.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull().default("text"), // text | single_choice | multiple_choice
  options: jsonb("options"), // string[] for choice types
  required: boolean("required").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  index("job_questions_job_id_idx").on(t.jobId),
]);

export const insertJobQuestionSchema = createInsertSchema(jobQuestionsTable).omit({ id: true });
export type InsertJobQuestion = z.infer<typeof insertJobQuestionSchema>;
export type JobQuestion = typeof jobQuestionsTable.$inferSelect;

// ── Job applications (postulaciones) ────────────────────────────────
export const jobApplicationsTable = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobPostingsTable.id, { onDelete: "cascade" }),
  applicantId: integer("applicant_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter"),
  status: text("status").notNull().default("pending"), // pending | visto | rechazado | finalista
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique().on(t.jobId, t.applicantId),
  index("job_applications_job_id_idx").on(t.jobId),
  index("job_applications_applicant_id_idx").on(t.applicantId),
]);

export const insertJobApplicationSchema = createInsertSchema(jobApplicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplicationsTable.$inferSelect;

// ── Job answers (respuestas a preguntas) ────────────────────────────
export const jobAnswersTable = pgTable("job_answers", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => jobApplicationsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => jobQuestionsTable.id, { onDelete: "cascade" }),
  answerText: text("answer_text"),
}, (t) => [
  unique().on(t.applicationId, t.questionId),
  index("job_answers_application_id_idx").on(t.applicationId),
]);

export const insertJobAnswerSchema = createInsertSchema(jobAnswersTable).omit({ id: true });
export type InsertJobAnswer = z.infer<typeof insertJobAnswerSchema>;
export type JobAnswer = typeof jobAnswersTable.$inferSelect;

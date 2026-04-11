import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db, usersTable, jobPostingsTable, jobQuestionsTable, jobApplicationsTable, jobAnswersTable, industriesTable, categoriesTable } from "@workspace/db";
import { eq, and, desc, ilike, or, inArray, isNotNull } from "drizzle-orm";

const VALID_QUESTION_TYPES = ["text", "single_choice", "multiple_choice"] as const;

function validateQuestions(questions: unknown[]): { valid: true; data: Array<{ questionText: string; questionType: string; options: string[] | null; required: boolean }> } | { valid: false } {
  for (const q of questions) {
    if (typeof q !== "object" || q === null) return { valid: false };
    const obj = q as Record<string, unknown>;
    if (typeof obj.questionText !== "string" || obj.questionText.length === 0 || obj.questionText.length > 500) return { valid: false };
    if (obj.questionType !== undefined && !VALID_QUESTION_TYPES.includes(obj.questionType as any)) return { valid: false };
    if (obj.options !== undefined && obj.options !== null) {
      if (!Array.isArray(obj.options) || obj.options.length > 20) return { valid: false };
      for (const o of obj.options) { if (typeof o !== "string" || o.length > 200) return { valid: false }; }
    }
  }
  return {
    valid: true,
    data: (questions as any[]).map(q => ({
      questionText: q.questionText,
      questionType: q.questionType ?? "text",
      options: q.options ?? null,
      required: q.required ?? true,
    })),
  };
}

const router: IRouter = Router();

// ── Helper: require auth ────────────────────────────────────────────
function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function requireAdmin(req: any, res: any, next: any): Promise<void> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "admin") { res.status(403).json({ error: "No autorizado" }); return; }
  next();
}

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, c => "\\" + c);
}

// ── GET /jobs — List active job postings ────────────────────────────
router.get("/jobs", async (req, res): Promise<void> => {
  const { search, locality, industry } = req.query as Record<string, string | undefined>;

  // Validate query param lengths
  if ((search && search.length > 100) || (locality && locality.length > 100) || (industry && industry.length > 100)) {
    res.status(400).json({ error: "Parámetros de búsqueda demasiado largos" });
    return;
  }

  const jobs = await db
    .select()
    .from(jobPostingsTable)
    .innerJoin(usersTable, eq(jobPostingsTable.companyId, usersTable.id))
    .where(
      and(
        eq(jobPostingsTable.isActive, true),
        eq(jobPostingsTable.adminApproved, true),
        eq(usersTable.companyApproved, true),
        search ? or(
          ilike(jobPostingsTable.title, `%${escapeLike(search)}%`),
          ilike(jobPostingsTable.description, `%${escapeLike(search)}%`)
        ) : undefined,
        locality ? ilike(jobPostingsTable.locality, `%${escapeLike(locality)}%`) : undefined,
        industry ? ilike(jobPostingsTable.industry, `%${escapeLike(industry)}%`) : undefined,
      )
    )
    .orderBy(desc(jobPostingsTable.createdAt))
    .limit(200);

  res.json(jobs.map(row => ({
    ...row.job_postings,
    createdAt: row.job_postings.createdAt.toISOString(),
    company: {
      id: row.users.id,
      name: row.users.name,
      companyName: row.users.companyName,
      avatarUrl: row.users.avatarUrl,
      locality: row.users.locality,
    },
  })));
});

// ── GET /jobs/my — Company's own job postings ───────────────────────
router.get("/jobs/my", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const jobs = await db
    .select()
    .from(jobPostingsTable)
    .where(eq(jobPostingsTable.companyId, userId))
    .orderBy(desc(jobPostingsTable.createdAt))
    .limit(200);

  res.json(jobs.map(j => ({ ...j, createdAt: j.createdAt.toISOString() })));
});

// ── GET /jobs/my-applications — Client sees their applications ──────
router.get("/jobs/my-applications", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const applications = await db
    .select()
    .from(jobApplicationsTable)
    .innerJoin(jobPostingsTable, eq(jobApplicationsTable.jobId, jobPostingsTable.id))
    .innerJoin(usersTable, eq(jobPostingsTable.companyId, usersTable.id))
    .where(eq(jobApplicationsTable.applicantId, userId))
    .orderBy(desc(jobApplicationsTable.createdAt))
    .limit(200);

  res.json(applications.map(row => ({
    ...row.job_applications,
    createdAt: row.job_applications.createdAt.toISOString(),
    job: {
      ...row.job_postings,
      createdAt: row.job_postings.createdAt.toISOString(),
    },
    company: {
      id: row.users.id,
      name: row.users.name,
      companyName: row.users.companyName,
      avatarUrl: row.users.avatarUrl,
    },
  })));
});

// ── GET /jobs/:id — Job detail with questions ───────────────────────
router.get("/jobs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [job] = await db
    .select()
    .from(jobPostingsTable)
    .innerJoin(usersTable, eq(jobPostingsTable.companyId, usersTable.id))
    .where(and(
      eq(jobPostingsTable.id, id),
      eq(jobPostingsTable.isActive, true),
      eq(jobPostingsTable.adminApproved, true),
      eq(usersTable.companyApproved, true),
    ));

  if (!job) {
    res.status(404).json({ error: "Vacante no encontrada" });
    return;
  }

  const questions = await db
    .select()
    .from(jobQuestionsTable)
    .where(eq(jobQuestionsTable.jobId, id))
    .orderBy(jobQuestionsTable.sortOrder);

  res.json({
    ...job.job_postings,
    createdAt: job.job_postings.createdAt.toISOString(),
    company: {
      id: job.users.id,
      name: job.users.name,
      companyName: job.users.companyName,
      avatarUrl: job.users.avatarUrl,
      locality: job.users.locality,
      companyIndustry: job.users.companyIndustry,
    },
    questions,
  });
});

// ── POST /jobs — Create job posting (company only) ──────────────────
router.post("/jobs", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "company") {
    res.status(403).json({ error: "Solo empresas pueden publicar vacantes" });
    return;
  }
  if (!user.companyApproved) {
    res.status(403).json({ error: "Tu cuenta de empresa aún no fue aprobada" });
    return;
  }

  const { title, description, industry, locality, modality, contractType, salaryMin, salaryMax, requirements, benefits, questions } = req.body;

  if (!title || typeof title !== "string" || !description || typeof description !== "string") {
    res.status(400).json({ error: "Título y descripción son obligatorios" });
    return;
  }
  if (title.length > 200) {
    res.status(400).json({ error: "El título no puede superar 200 caracteres" });
    return;
  }
  if (description.length > 5000) {
    res.status(400).json({ error: "La descripción no puede superar 5000 caracteres" });
    return;
  }

  // Validate salary bounds
  if (salaryMin !== undefined && salaryMin !== null && (typeof salaryMin !== "number" || salaryMin < 0 || salaryMin > 100000000)) {
    res.status(400).json({ error: "Salario mínimo inválido" });
    return;
  }
  if (salaryMax !== undefined && salaryMax !== null && (typeof salaryMax !== "number" || salaryMax < 0 || salaryMax > 100000000)) {
    res.status(400).json({ error: "Salario máximo inválido" });
    return;
  }
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) {
    res.status(400).json({ error: "El salario máximo no puede ser menor al mínimo" });
    return;
  }

  // Validate questions before DB transaction
  let parsedQuestions: ReturnType<typeof validateQuestions> | null = null;
  if (questions && Array.isArray(questions) && questions.length > 0) {
    if (questions.length > 20) {
      res.status(400).json({ error: "Máximo 20 preguntas por vacante" });
      return;
    }
    parsedQuestions = validateQuestions(questions);
    if (!parsedQuestions.valid) {
      res.status(400).json({ error: "Formato de preguntas inválido" });
      return;
    }
  }

  const result = await db.transaction(async (tx) => {
    const [job] = await tx.insert(jobPostingsTable).values({
      companyId: userId,
      title,
      description,
      industry: industry ?? null,
      locality: locality ?? null,
      modality: modality ?? "presencial",
      contractType: contractType ?? "full_time",
      salaryMin: salaryMin ?? null,
      salaryMax: salaryMax ?? null,
      requirements: requirements ?? null,
      benefits: benefits ?? null,
    }).returning();

    if (parsedQuestions && parsedQuestions.valid) {
      await tx.insert(jobQuestionsTable).values(
        parsedQuestions.data.map((q, i) => ({
          jobId: job.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          required: q.required,
          sortOrder: i,
        }))
      );
    }
    return job;
  });

  res.status(201).json({ ...result, createdAt: result.createdAt.toISOString() });
});

// ── PATCH /jobs/:id — Update job posting ────────────────────────────
router.patch("/jobs/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [existing] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  if (!existing || existing.companyId !== userId) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { title, description, industry, locality, modality, contractType, salaryMin, salaryMax, requirements, benefits, isActive, questions } = req.body;

  const updates: Record<string, unknown> = {};
  if (title !== undefined) {
    if (typeof title !== "string" || title.length > 200) { res.status(400).json({ error: "Título inválido" }); return; }
    updates.title = title;
  }
  if (description !== undefined) {
    if (typeof description !== "string" || description.length > 5000) { res.status(400).json({ error: "Descripción inválida" }); return; }
    updates.description = description;
  }
  if (industry !== undefined) updates.industry = industry;
  if (locality !== undefined) updates.locality = locality;
  if (modality !== undefined) updates.modality = modality;
  if (contractType !== undefined) updates.contractType = contractType;
  if (salaryMin !== undefined) updates.salaryMin = salaryMin;
  if (salaryMax !== undefined) updates.salaryMax = salaryMax;
  if (requirements !== undefined) updates.requirements = requirements;
  if (benefits !== undefined) updates.benefits = benefits;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db.update(jobPostingsTable).set(updates).where(eq(jobPostingsTable.id, id)).returning();

  // Replace questions if provided
  if (questions && Array.isArray(questions)) {
    if (questions.length > 20) {
      res.status(400).json({ error: "Máximo 20 preguntas por vacante" });
      return;
    }
    await db.delete(jobQuestionsTable).where(eq(jobQuestionsTable.jobId, id));
    if (questions.length > 0) {
      const parsed = validateQuestions(questions);
      if (!parsed.valid) {
        res.status(400).json({ error: "Formato de preguntas inválido" });
        return;
      }
      await db.insert(jobQuestionsTable).values(
        parsed.data.map((q, i) => ({
          jobId: id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          required: q.required,
          sortOrder: i,
        }))
      );
    }
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// ── DELETE /jobs/:id ────────────────────────────────────────────────
router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [existing] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  if (!existing || existing.companyId !== userId) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  await db.delete(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  res.json({ success: true });
});

// ── POST /jobs/:id/apply — Apply to a job ───────────────────────
router.post("/jobs/:id/apply", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const jobId = Number(req.params.id);
  if (isNaN(jobId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [job] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, jobId));
  if (!job || !job.isActive) {
    res.status(404).json({ error: "Vacante no encontrada o cerrada" });
    return;
  }

  // Check not already applied
  const [existing] = await db.select().from(jobApplicationsTable)
    .where(and(eq(jobApplicationsTable.jobId, jobId), eq(jobApplicationsTable.applicantId, userId)));
  if (existing) {
    res.status(400).json({ error: "Ya te postulaste a esta vacante" });
    return;
  }

  const { coverLetter, answers } = req.body;

  if (coverLetter !== undefined && (typeof coverLetter !== "string" || coverLetter.length > 2000)) {
    res.status(400).json({ error: "Carta de presentación demasiado larga (máx 2000)" });
    return;
  }

  // Validate answers structure
  if (answers !== undefined && answers !== null) {
    if (!Array.isArray(answers) || answers.length > 20) {
      res.status(400).json({ error: "Respuestas inválidas" });
      return;
    }
    for (const a of answers) {
      if (typeof a !== "object" || a === null) { res.status(400).json({ error: "Respuestas inválidas" }); return; }
      if (typeof a.questionId !== "number") { res.status(400).json({ error: "Respuestas inválidas" }); return; }
      if (a.answerText !== undefined && a.answerText !== null && (typeof a.answerText !== "string" || a.answerText.length > 2000)) {
        res.status(400).json({ error: "Respuesta demasiado larga" });
        return;
      }
    }

    // Validate question IDs belong to this job
    const jobQuestions = await db.select({ id: jobQuestionsTable.id }).from(jobQuestionsTable).where(eq(jobQuestionsTable.jobId, jobId));
    const validQIds = new Set(jobQuestions.map(q => q.id));
    for (const a of answers) {
      if (!validQIds.has(a.questionId)) {
        res.status(400).json({ error: "Pregunta inválida para esta vacante" });
        return;
      }
    }
  }

  const [application] = await db.insert(jobApplicationsTable).values({
    jobId,
    applicantId: userId,
    coverLetter: coverLetter ?? null,
  }).returning();

  // Insert answers
  if (answers && Array.isArray(answers) && answers.length > 0) {
    await db.insert(jobAnswersTable).values(
      answers.map((a: any) => ({
        applicationId: application.id,
        questionId: a.questionId,
        answerText: a.answerText ?? null,
      }))
    );
  }

  res.status(201).json({ ...application, createdAt: application.createdAt.toISOString() });
});

// ── GET /jobs/:id/applications — Company sees applications ──────────
router.get("/jobs/:id/applications", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const jobId = Number(req.params.id);
  if (isNaN(jobId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [job] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, jobId));
  if (!job || job.companyId !== userId) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const applications = await db
    .select()
    .from(jobApplicationsTable)
    .innerJoin(usersTable, eq(jobApplicationsTable.applicantId, usersTable.id))
    .where(eq(jobApplicationsTable.jobId, jobId))
    .orderBy(desc(jobApplicationsTable.createdAt));

  // Get all answers for these applications in a single batch query
  const appIds = applications.map(a => a.job_applications.id);
  let answersMap: Record<number, any[]> = {};

  if (appIds.length > 0) {
    const [questions, allAnswers] = await Promise.all([
      db.select().from(jobQuestionsTable).where(eq(jobQuestionsTable.jobId, jobId)),
      db.select().from(jobAnswersTable).where(inArray(jobAnswersTable.applicationId, appIds)),
    ]);
    const questionMap = Object.fromEntries(questions.map(q => [q.id, q]));
    for (const a of allAnswers) {
      if (!answersMap[a.applicationId]) answersMap[a.applicationId] = [];
      answersMap[a.applicationId].push({
        ...a,
        question: questionMap[a.questionId],
      });
    }
  }

  res.json(applications.map(row => ({
    ...row.job_applications,
    createdAt: row.job_applications.createdAt.toISOString(),
    applicant: {
      id: row.users.id,
      name: row.users.name,
      email: row.users.email,
      phone: row.users.phone,
      avatarUrl: row.users.avatarUrl,
      locality: row.users.locality,
      cvUrl: row.users.cvUrl,
    },
    answers: answersMap[row.job_applications.id] || [],
  })));
});

// ── PATCH /jobs/applications/:id/status — Update application status ─
router.patch("/jobs/applications/:id/status", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const appId = Number(req.params.id);
  if (isNaN(appId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const [application] = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.id, appId));
  if (!application) {
    res.status(404).json({ error: "Postulación no encontrada" });
    return;
  }

  const [job] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, application.jobId));
  if (!job || job.companyId !== userId) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const { status } = req.body;
  if (!["pending", "visto", "rechazado", "finalista"].includes(status)) {
    res.status(400).json({ error: "Estado inválido" });
    return;
  }

  const [updated] = await db.update(jobApplicationsTable).set({ status }).where(eq(jobApplicationsTable.id, appId)).returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// ── GET /cvs/public — Companies view public CVs ────────────────────
const cvsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: "Demasiadas solicitudes, intente más tarde" } });
router.get("/cvs/public", cvsLimiter, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "No autenticado" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "company") {
    res.status(403).json({ error: "Solo empresas pueden ver CVs públicos" });
    return;
  }

  const { search, locality, categoryId } = req.query as Record<string, string | undefined>;

  if ((search && search.length > 100) || (locality && locality.length > 100)) {
    res.status(400).json({ error: "Parámetros de búsqueda demasiado largos" });
    return;
  }

  const results = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    phone: usersTable.phone,
    avatarUrl: usersTable.avatarUrl,
    locality: usersTable.locality,
    cvUrl: usersTable.cvUrl,
    cvCategories: usersTable.cvCategories,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(
    and(
      eq(usersTable.cvPublic, true),
      isNotNull(usersTable.cvUrl),
      search ? ilike(usersTable.name, `%${escapeLike(search)}%`) : undefined,
      locality ? ilike(usersTable.locality, `%${escapeLike(locality)}%`) : undefined,
    )
  ).orderBy(desc(usersTable.createdAt)).limit(200);

  // Filter by category in application layer (jsonb filtering)
  let filtered = results;
  if (categoryId) {
    const catId = Number(categoryId);
    filtered = results.filter(u => {
      const cats = u.cvCategories;
      if (cats === "all" || cats === null) return true;
      if (Array.isArray(cats)) return cats.includes(catId);
      return true;
    });
  }

  res.json(filtered.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

// ── Admin: GET /admin/companies — List company accounts ─────────────
router.get("/admin/companies", requireAdmin, async (req, res): Promise<void> => {
  const companies = await db.select().from(usersTable)
    .where(eq(usersTable.role, "company"))
    .orderBy(desc(usersTable.createdAt))
    .limit(500);

  res.json(companies.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    companyName: c.companyName,
    cuit: c.cuit,
    companyAddress: c.companyAddress,
    companyIndustry: c.companyIndustry,
    companyApproved: c.companyApproved,
    locality: c.locality,
    createdAt: c.createdAt.toISOString(),
  })));
});

// ── Admin: PATCH /admin/companies/:id/approve ───────────────────────
router.patch("/admin/companies/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const companyId = Number(req.params.id);
  const { approved } = req.body;

  const [updated] = await db.update(usersTable)
    .set({ companyApproved: approved === true })
    .where(and(eq(usersTable.id, companyId), eq(usersTable.role, "company")))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Empresa no encontrada" });
    return;
  }

  res.json({ success: true, companyApproved: updated.companyApproved });
});

// ── GET /jobs/:id/check-applied — Check if user already applied ─────
router.get("/jobs/:id/check-applied", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.json({ applied: false }); return; }

  const jobId = Number(req.params.id);
  const [existing] = await db.select().from(jobApplicationsTable)
    .where(and(eq(jobApplicationsTable.jobId, jobId), eq(jobApplicationsTable.applicantId, userId)));

  res.json({ applied: !!existing });
});

// ── Admin: GET /admin/jobs/:id — Job detail for admin ────────────────
router.get("/admin/jobs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [job] = await db
    .select()
    .from(jobPostingsTable)
    .innerJoin(usersTable, eq(jobPostingsTable.companyId, usersTable.id))
    .where(eq(jobPostingsTable.id, id));

  if (!job) {
    res.status(404).json({ error: "Vacante no encontrada" });
    return;
  }

  const questions = await db
    .select()
    .from(jobQuestionsTable)
    .where(eq(jobQuestionsTable.jobId, id))
    .orderBy(jobQuestionsTable.sortOrder);

  res.json({
    ...job.job_postings,
    createdAt: job.job_postings.createdAt.toISOString(),
    company: {
      id: job.users.id,
      name: job.users.name,
      companyName: job.users.companyName,
      email: job.users.email,
      cuit: job.users.cuit,
      companyAddress: job.users.companyAddress,
      companyIndustry: job.users.companyIndustry,
      avatarUrl: job.users.avatarUrl,
      locality: job.users.locality,
    },
    questions,
  });
});

// ── GET /industries — List all industries ───────────────────────────
router.get("/industries", async (_req, res): Promise<void> => {
  const industries = await db.select().from(industriesTable).orderBy(industriesTable.name).limit(200);
  res.json(industries);
});

// ── Admin: POST /admin/industries — Create industry ─────────────────
router.post("/admin/industries", requireAdmin, async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "El nombre es obligatorio" });
    return;
  }

  try {
    const [industry] = await db.insert(industriesTable).values({ name: name.trim() }).returning();
    res.status(201).json(industry);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Ya existe un rubro con ese nombre" });
      return;
    }
    throw err;
  }
});

// ── Admin: PATCH /admin/industries/:id — Update industry ────────────
router.patch("/admin/industries/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: "El nombre es obligatorio" });
    return;
  }

  try {
    const [updated] = await db.update(industriesTable).set({ name: name.trim() }).where(eq(industriesTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Rubro no encontrado" });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Ya existe un rubro con ese nombre" });
      return;
    }
    throw err;
  }
});

// ── Admin: DELETE /admin/industries/:id — Delete industry ───────────
router.delete("/admin/industries/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(industriesTable).where(eq(industriesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Rubro no encontrado" });
    return;
  }
  res.json({ success: true });
});

export default router;

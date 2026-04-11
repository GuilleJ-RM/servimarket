import { Router, type IRouter } from "express";
import { db, usersTable, listingsTable, categoriesTable, conversationsTable, messagesTable, jobPostingsTable } from "@workspace/db";
import { eq, count, and, inArray, ilike } from "drizzle-orm";
import { logger } from "../lib/logger";
import { AdminCreateCategoryBody, AdminUpdateCategoryBody, AdminUpdateUserBody } from "@workspace/api-zod";
import bcrypt from "bcryptjs";
import { sendEmail } from "../lib/email";

const router: IRouter = Router();

// Middleware: require admin role
async function requireAdmin(req: any, res: any, next: any): Promise<void> {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    return;
  }
  next();
}

// GET /admin/users - List all users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).limit(500);
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      locality: u.locality,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// PATCH /admin/users/:id - Update any user
router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = AdminUpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  const updates: Record<string, any> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.email) {
    const normalizedEmail = parsed.data.email.toLowerCase();
    const [dup] = await db.select({ id: usersTable.id }).from(usersTable).where(ilike(usersTable.email, normalizedEmail));
    if (dup && dup.id !== id) {
      res.status(400).json({ error: "El email ya está en uso por otro usuario" });
      return;
    }
    updates.email = normalizedEmail;
  }
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.locality !== undefined) updates.locality = parsed.data.locality;
  if (parsed.data.password) {
    updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    // Notify user that their password was changed by admin
    sendEmail(
      existing.email,
      "Tu contrase\u00f1a fue actualizada - Mil Laburos",
      `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #E67E22;">Mil Laburos</h2>
        <p>Hola <strong>${existing.name.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))}</strong>,</p>
        <p>Un administrador ha actualizado tu contrase\u00f1a. Si no solicitaste este cambio, por favor contact\u00e1 a soporte de inmediato.</p>
      </div>`,
    ).catch(err => logger.error({ err }, "Failed to send password change notification"));
  }

  if (Object.keys(updates).length === 0) {
    res.json({
      id: existing.id, name: existing.name, email: existing.email,
      role: existing.role, phone: existing.phone, avatarUrl: existing.avatarUrl,
      locality: existing.locality, createdAt: existing.createdAt.toISOString(),
    });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  logger.info({ userId: id }, "Admin updated user");
  res.json({
    id: updated.id, name: updated.name, email: updated.email,
    role: updated.role, phone: updated.phone, avatarUrl: updated.avatarUrl,
    locality: updated.locality, createdAt: updated.createdAt.toISOString(),
  });
});

// DELETE /admin/users/:id - Delete any user
router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  // Prevent deleting yourself
  const adminId = req.session?.userId;
  if (existing.id === adminId) {
    res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  logger.info({ userId: id }, "Admin deleted user");
  res.json({ success: true });
});

// GET /admin/listings - List all listings with provider info
router.get("/admin/listings", requireAdmin, async (req, res): Promise<void> => {
  const listings = await db.select().from(listingsTable).limit(500);

  if (listings.length === 0) {
    res.json([]);
    return;
  }

  const providerIds = [...new Set(listings.map((l) => l.providerId))];
  const categoryIds = [...new Set(listings.map((l) => l.categoryId))];

  const providers = await db.select().from(usersTable).where(inArray(usersTable.id, providerIds));
  const categories = await db.select().from(categoriesTable).where(inArray(categoriesTable.id, categoryIds));

  const providerMap = Object.fromEntries(providers.map((p) => [p.id, p]));
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  res.json(
    listings.map((l) => {
      const provider = providerMap[l.providerId];
      const category = categoryMap[l.categoryId];
      return {
        id: l.id,
        providerId: l.providerId,
        categoryId: l.categoryId,
        title: l.title,
        description: l.description,
        type: l.type,
        price: l.price,
        imageUrl: l.imageUrl,
        whatsapp: l.whatsapp,
        paymentMethods: l.paymentMethods,
        isActive: l.isActive,
        adminApproved: l.adminApproved,
        createdAt: l.createdAt.toISOString(),
        provider: provider
          ? {
              id: provider.id,
              name: provider.name,
              email: provider.email,
              role: provider.role,
              phone: provider.phone,
              avatarUrl: provider.avatarUrl,
              createdAt: provider.createdAt.toISOString(),
            }
          : null,
        category: category
          ? {
              id: category.id,
              name: category.name,
              icon: category.icon,
              description: category.description,
            }
          : null,
      };
    })
  );
});

// DELETE /admin/listings/:id - Delete any listing
router.delete("/admin/listings/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!listing) {
    res.status(404).json({ error: "Publicación no encontrada" });
    return;
  }

  await db.delete(listingsTable).where(eq(listingsTable.id, id));
  logger.info({ listingId: id }, "Admin deleted listing");
  res.json({ success: true });
});

// PATCH /admin/listings/:id/approve - Approve or reject a listing
router.patch("/admin/listings/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { approved } = req.body;
  if (typeof approved !== "boolean") {
    res.status(400).json({ error: "Campo 'approved' requerido (boolean)" });
    return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!listing) {
    res.status(404).json({ error: "Publicación no encontrada" });
    return;
  }

  await db.update(listingsTable).set({ adminApproved: approved }).where(eq(listingsTable.id, id));
  logger.info({ listingId: id, approved }, "Admin updated listing approval");
  res.json({ success: true, adminApproved: approved });
});

// GET /admin/jobs - List all job postings (admin only)
router.get("/admin/jobs", requireAdmin, async (req, res): Promise<void> => {
  const jobs = await db
    .select()
    .from(jobPostingsTable)
    .innerJoin(usersTable, eq(jobPostingsTable.companyId, usersTable.id))
    .orderBy(jobPostingsTable.createdAt)
    .limit(500);

  res.json(jobs.map(row => ({
    ...row.job_postings,
    createdAt: row.job_postings.createdAt.toISOString(),
    company: {
      id: row.users.id,
      name: row.users.name,
      companyName: row.users.companyName,
      email: row.users.email,
    },
  })));
});

// PATCH /admin/jobs/:id/approve - Approve or reject a job posting
router.patch("/admin/jobs/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { approved } = req.body;
  if (typeof approved !== "boolean") {
    res.status(400).json({ error: "Campo 'approved' requerido (boolean)" });
    return;
  }

  const [job] = await db.select().from(jobPostingsTable).where(eq(jobPostingsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Vacante no encontrada" });
    return;
  }

  await db.update(jobPostingsTable).set({ adminApproved: approved }).where(eq(jobPostingsTable.id, id));
  logger.info({ jobId: id, approved }, "Admin updated job approval");
  res.json({ success: true, adminApproved: approved });
});

// GET /admin/stats - Platform statistics
router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [usersCount] = await db.select({ count: count() }).from(usersTable);
  const [providersCount] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "provider"));
  const [clientsCount] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "client"));
  const [listingsCount] = await db.select({ count: count() }).from(listingsTable);
  const [activeListingsCount] = await db
    .select({ count: count() })
    .from(listingsTable)
    .where(eq(listingsTable.isActive, true));
  const [conversationsCount] = await db.select({ count: count() }).from(conversationsTable);
  const [messagesCount] = await db.select({ count: count() }).from(messagesTable);

  res.json({
    totalUsers: usersCount.count,
    totalProviders: providersCount.count,
    totalClients: clientsCount.count,
    totalListings: listingsCount.count,
    activeListings: activeListingsCount.count,
    totalConversations: conversationsCount.count,
    totalMessages: messagesCount.count,
  });
});

// POST /admin/categories - Create a category
router.post("/admin/categories", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, icon, type, description } = parsed.data;
  const [category] = await db
    .insert(categoriesTable)
    .values({ name, icon, type, description: description ?? null })
    .returning();

  logger.info({ categoryId: category.id }, "Admin created category");
  res.status(201).json({
    id: category.id,
    name: category.name,
    icon: category.icon,
    type: category.type,
    description: category.description,
  });
});

// PATCH /admin/categories/:id - Update a category
router.patch("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = AdminUpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }

  const updates: Record<string, any> = {};
  if (parsed.data.name !== undefined && parsed.data.name !== null) updates.name = parsed.data.name;
  if (parsed.data.icon !== undefined && parsed.data.icon !== null) updates.icon = parsed.data.icon;
  if (parsed.data.type !== undefined && parsed.data.type !== null) updates.type = parsed.data.type;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  if (Object.keys(updates).length === 0) {
    res.json({ id: existing.id, name: existing.name, icon: existing.icon, type: existing.type, description: existing.description });
    return;
  }

  const [updated] = await db
    .update(categoriesTable)
    .set(updates)
    .where(eq(categoriesTable.id, id))
    .returning();

  logger.info({ categoryId: id }, "Admin updated category");
  res.json({
    id: updated.id,
    name: updated.name,
    icon: updated.icon,
    type: updated.type,
    description: updated.description,
  });
});

// DELETE /admin/categories/:id - Delete a category
router.delete("/admin/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }

  // Check if any listings use this category
  const [listingCount] = await db
    .select({ count: count() })
    .from(listingsTable)
    .where(eq(listingsTable.categoryId, id));

  if (listingCount.count > 0) {
    res.status(400).json({ error: `No se puede eliminar: hay ${listingCount.count} publicación(es) usando esta categoría` });
    return;
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  logger.info({ categoryId: id }, "Admin deleted category");
  res.json({ success: true });
});

export default router;

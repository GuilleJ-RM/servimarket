import { Router, type IRouter } from "express";
import { db, usersTable, conversationsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";

const router: IRouter = Router();

// POST /support/conversation - Create or get support conversation with admin
router.post("/support/conversation", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  // Find admin user
  const [admin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);

  if (!admin) {
    res.status(500).json({ error: "No hay administrador configurado en el sistema" });
    return;
  }

  // Don't allow admin to message themselves
  if (userId === admin.id) {
    res.status(400).json({ error: "El administrador no puede crear conversaciones de soporte consigo mismo" });
    return;
  }

  // Check if a support conversation already exists (conversation with admin, no listing)
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        or(
          and(eq(conversationsTable.clientId, userId), eq(conversationsTable.providerId, admin.id)),
          and(eq(conversationsTable.clientId, admin.id), eq(conversationsTable.providerId, userId))
        )
      )
    )
    .limit(1);

  if (existing) {
    res.json({
      id: existing.id,
      clientId: existing.clientId,
      providerId: existing.providerId,
      listingId: existing.listingId,
      createdAt: existing.createdAt.toISOString(),
    });
    return;
  }

  // Create new support conversation
  const [conv] = await db
    .insert(conversationsTable)
    .values({
      clientId: userId,
      providerId: admin.id,
      listingId: null,
    })
    .returning();

  res.status(201).json({
    id: conv.id,
    clientId: conv.clientId,
    providerId: conv.providerId,
    listingId: conv.listingId,
    createdAt: conv.createdAt.toISOString(),
  });
});

export default router;

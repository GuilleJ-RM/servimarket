import { Router, type IRouter } from "express";
import { db, bookingsTable, listingsTable, usersTable, conversationsTable, messagesTable } from "@workspace/db";
import { eq, or, and, desc, inArray } from "drizzle-orm";
import { CreateBookingBody, UpdateBookingStatusBody, UpdateBookingBody } from "@workspace/api-zod";
import { sendEmail, buildNewBookingEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /bookings - Get all bookings for the logged-in user (as client or provider)
router.get("/bookings", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(or(eq(bookingsTable.clientId, userId), eq(bookingsTable.providerId, userId)))
    .orderBy(desc(bookingsTable.createdAt));

  if (bookings.length === 0) {
    res.json([]);
    return;
  }

  // Collect unique IDs for joins
  const listingIds = [...new Set(bookings.map(b => b.listingId))];
  const userIds = [...new Set(bookings.flatMap(b => [b.clientId, b.providerId]))];

  const listings = await db.select().from(listingsTable).where(inArray(listingsTable.id, listingIds));
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));

  const listingMap = Object.fromEntries(listings.map(l => [l.id, l]));
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  res.json(bookings.map(b => {
    const listing = listingMap[b.listingId];
    const client = userMap[b.clientId];
    const provider = userMap[b.providerId];
    return {
      id: b.id,
      listingId: b.listingId,
      clientId: b.clientId,
      providerId: b.providerId,
      status: b.status,
      scheduledDate: b.scheduledDate?.toISOString() ?? null,
      notes: b.notes,
      quantity: b.quantity,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      listing: listing ? {
        id: listing.id,
        providerId: listing.providerId,
        categoryId: listing.categoryId,
        title: listing.title,
        description: listing.description,
        type: listing.type,
        price: listing.price,
        imageUrl: listing.imageUrl,
        whatsapp: listing.whatsapp,
        paymentMethods: listing.paymentMethods,
        isActive: listing.isActive,
        quantity: listing.quantity,
        status: listing.status,
        createdAt: listing.createdAt.toISOString(),
      } : null,
      client: client ? {
        id: client.id,
        name: client.name,
        email: client.email,
        role: client.role,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        locality: client.locality,
        createdAt: client.createdAt.toISOString(),
      } : null,
      provider: provider ? {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        role: provider.role,
        phone: provider.phone,
        avatarUrl: provider.avatarUrl,
        locality: provider.locality,
        createdAt: provider.createdAt.toISOString(),
      } : null,
    };
  }));
});

// POST /bookings - Create a new booking
router.post("/bookings", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { listingId, scheduledDate, notes, quantity } = parsed.data;

  // Validate listing exists and is active
  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId));
  if (!listing) {
    res.status(404).json({ error: "Publicación no encontrada" });
    return;
  }
  if (!listing.isActive || listing.status === "sold") {
    res.status(400).json({ error: "Esta publicación ya no está disponible" });
    return;
  }

  // Can't book your own listing
  if (listing.providerId === userId) {
    res.status(400).json({ error: "No puedes reservar tu propia publicación" });
    return;
  }

  // For products, check stock
  const bookingQuantity = quantity ?? 1;
  if (listing.type === "product" && listing.quantity !== null) {
    if (bookingQuantity > listing.quantity) {
      res.status(400).json({ error: `Solo hay ${listing.quantity} disponibles` });
      return;
    }
  }

  const [booking] = await db.insert(bookingsTable).values({
    listingId,
    clientId: userId,
    providerId: listing.providerId,
    scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    notes: notes ?? null,
    quantity: bookingQuantity,
  }).returning();

  // Auto-send a web message with booking details
  try {
    // Find or create conversation between client and provider for this listing
    let [conv] = await db.select().from(conversationsTable).where(
      or(
        and(eq(conversationsTable.clientId, userId), eq(conversationsTable.providerId, listing.providerId)),
        and(eq(conversationsTable.clientId, listing.providerId), eq(conversationsTable.providerId, userId))
      )
    );
    if (!conv) {
      [conv] = await db.insert(conversationsTable).values({
        clientId: userId,
        providerId: listing.providerId,
        listingId,
      }).returning();
    }

    // Build the auto-message content
    const isService = listing.type === "service";
    const [client] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    let msgContent = isService
      ? `📋 Nuevo agendamiento de servicio`
      : `📋 Nuevo pedido de compra`;
    msgContent += `\n📌 Publicación: ${listing.title}`;
    if (scheduledDate) {
      const d = new Date(scheduledDate);
      msgContent += `\n📅 Fecha: ${d.toLocaleDateString("es-AR")} a las ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (!isService && bookingQuantity > 1) {
      msgContent += `\n📦 Cantidad: ${bookingQuantity}`;
    }
    if (notes) {
      msgContent += `\n📝 Notas: ${notes}`;
    }
    msgContent += `\n\n⏳ Estado: Pendiente de confirmación`;

    await db.insert(messagesTable).values({
      conversationId: conv.id,
      senderId: userId,
      content: msgContent,
    });
  } catch (_err) {
    // Non-critical: don't fail the booking if message fails
  }

  // Email notification to provider
  try {
    const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, listing.providerId));
    const [client] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (provider && client && provider.notifyEmail) {
      const baseUrl = process.env.APP_URL || "http://localhost:5173";
      const bookingUrl = `${baseUrl}/pedidos`;
      sendEmail(
        provider.email,
        `Nuevo pedido de ${client.name} - Mil Laburos`,
        buildNewBookingEmail(provider.name, client.name, listing.title, bookingUrl),
      ).catch(err => logger.error({ err }, "Failed to send booking email notification"));
    }
  } catch (_err) {
    // Non-critical
  }

  res.status(201).json({
    id: booking.id,
    listingId: booking.listingId,
    clientId: booking.clientId,
    providerId: booking.providerId,
    status: booking.status,
    scheduledDate: booking.scheduledDate?.toISOString() ?? null,
    notes: booking.notes,
    quantity: booking.quantity,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  });
});

// PATCH /bookings/:id/status - Update booking status
router.patch("/bookings/:id/status", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status: newStatus } = parsed.data;

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) {
    res.status(404).json({ error: "Reserva no encontrada" });
    return;
  }

  // Authorization: provider or client depending on the action
  const isProvider = booking.providerId === userId;
  const isClient = booking.clientId === userId;
  if (!isProvider && !isClient) {
    res.status(403).json({ error: "Sin permisos" });
    return;
  }

  // Valid transitions
  const validTransitions: Record<string, { status: string; by: string }[]> = {
    pending: [
      { status: "confirmed", by: "provider" },
      { status: "cancelled", by: "client" },
      { status: "cancelled", by: "provider" },
    ],
    confirmed: [
      { status: "in_progress", by: "provider" },
      { status: "cancelled", by: "client" },
      { status: "cancelled", by: "provider" },
    ],
    in_progress: [
      { status: "completed", by: "provider" },
      { status: "delivered", by: "provider" },
    ],
  };

  const allowed = validTransitions[booking.status] ?? [];
  const role = isProvider ? "provider" : "client";
  const isValid = allowed.some(t => t.status === newStatus && t.by === role);
  if (!isValid) {
    res.status(400).json({ error: `No se puede cambiar de "${booking.status}" a "${newStatus}"` });
    return;
  }

  // For products: when delivered, reduce stock
  if (newStatus === "delivered" || newStatus === "completed") {
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, booking.listingId));
    if (listing && listing.type === "product" && listing.quantity !== null) {
      const newQuantity = Math.max(0, listing.quantity - booking.quantity);
      const updateData: Record<string, unknown> = { quantity: newQuantity };
      if (newQuantity === 0) {
        updateData.status = "sold";
      }
      await db.update(listingsTable).set(updateData).where(eq(listingsTable.id, listing.id));
    }
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(bookingsTable.id, id))
    .returning();

  res.json({
    id: updated.id,
    listingId: updated.listingId,
    clientId: updated.clientId,
    providerId: updated.providerId,
    status: updated.status,
    scheduledDate: updated.scheduledDate?.toISOString() ?? null,
    notes: updated.notes,
    quantity: updated.quantity,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// PATCH /bookings/:id - Edit booking details (scheduledDate, notes) - provider only
router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) {
    res.status(404).json({ error: "Reserva no encontrada" });
    return;
  }

  if (booking.providerId !== userId) {
    res.status(403).json({ error: "Solo el proveedor puede editar la reserva" });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.scheduledDate !== undefined) {
    updateData.scheduledDate = parsed.data.scheduledDate ? new Date(parsed.data.scheduledDate) : null;
  }
  if (parsed.data.notes !== undefined) {
    updateData.notes = parsed.data.notes;
  }

  const [updatedBooking] = await db
    .update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, id))
    .returning();

  res.json({
    id: updatedBooking.id,
    listingId: updatedBooking.listingId,
    clientId: updatedBooking.clientId,
    providerId: updatedBooking.providerId,
    status: updatedBooking.status,
    scheduledDate: updatedBooking.scheduledDate?.toISOString() ?? null,
    notes: updatedBooking.notes,
    quantity: updatedBooking.quantity,
    createdAt: updatedBooking.createdAt.toISOString(),
    updatedAt: updatedBooking.updatedAt.toISOString(),
  });
});

export default router;

import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, usersTable, listingsTable, categoriesTable, bookingsTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { CreateConversationBody, SendMessageBody } from "@workspace/api-zod";
import { inArray } from "drizzle-orm";
import { sendEmail, buildNewMessageEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/conversations", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  let convs = await db
    .select()
    .from(conversationsTable)
    .where(or(eq(conversationsTable.clientId, userId), eq(conversationsTable.providerId, userId)))
    .orderBy(desc(conversationsTable.createdAt));

  if (convs.length === 0) {
    res.json([]);
    return;
  }

  // For providers: only show conversations that have at least 1 message or are linked to a booking
  if (currentUser?.role === "provider") {
    const convIds = convs.map(c => c.id);
    const convsWithMessages = await db
      .select({ conversationId: messagesTable.conversationId })
      .from(messagesTable)
      .where(inArray(messagesTable.conversationId, convIds))
      .groupBy(messagesTable.conversationId);
    const convsWithMsgIds = new Set(convsWithMessages.map(m => m.conversationId));

    const convListingIds = convs.map(c => c.listingId).filter((id): id is number => id !== null);
    let convsWithBookingIds = new Set<number>();
    if (convListingIds.length > 0) {
      const bookings = await db
        .select({ listingId: bookingsTable.listingId, clientId: bookingsTable.clientId })
        .from(bookingsTable)
        .where(and(
          inArray(bookingsTable.listingId, convListingIds),
          eq(bookingsTable.providerId, userId)
        ));
      // Map booking clientId+listingId to conversation IDs
      for (const conv of convs) {
        if (conv.listingId && bookings.some(b => b.listingId === conv.listingId && b.clientId === conv.clientId)) {
          convsWithBookingIds.add(conv.id);
        }
      }
    }

    convs = convs.filter(c => convsWithMsgIds.has(c.id) || convsWithBookingIds.has(c.id));
    if (convs.length === 0) {
      res.json([]);
      return;
    }
  }

  const userIds = [...new Set([...convs.map(c => c.clientId), ...convs.map(c => c.providerId)])];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const listingIds = convs.map(c => c.listingId).filter((id): id is number => id !== null);
  let listingMap: Record<number, { listing: typeof listingsTable.$inferSelect, provider: typeof usersTable.$inferSelect, category: typeof categoriesTable.$inferSelect }> = {};
  if (listingIds.length > 0) {
    const listings = await db.select().from(listingsTable).where(inArray(listingsTable.id, listingIds));
    const catIds = [...new Set(listings.map(l => l.categoryId))];
    const cats = await db.select().from(categoriesTable).where(inArray(categoriesTable.id, catIds));
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
    listings.forEach(l => {
      listingMap[l.id] = { listing: l, provider: userMap[l.providerId], category: catMap[l.categoryId] };
    });
  }

  const result = [];
  for (const conv of convs) {
    const lastMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);

    const unreadMessages = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.conversationId, conv.id), eq(messagesTable.isRead, false)));

    const unreadCount = unreadMessages.filter(m => m.senderId !== userId).length;

    const lastMessage = lastMessages[0];
    let lastMsgFormatted = undefined;
    if (lastMessage) {
      lastMsgFormatted = {
        id: lastMessage.id,
        conversationId: lastMessage.conversationId,
        senderId: lastMessage.senderId,
        content: lastMessage.content,
        isRead: lastMessage.isRead,
        createdAt: lastMessage.createdAt.toISOString(),
        sender: formatUser(userMap[lastMessage.senderId]),
      };
    }

    const listingEntry = conv.listingId ? listingMap[conv.listingId] : null;
    let listingFormatted = undefined;
    if (listingEntry) {
      const { listing: l, provider: p, category: cat } = listingEntry;
      listingFormatted = {
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
        createdAt: l.createdAt.toISOString(),
        provider: p ? formatUser(p) : formatUser(userMap[l.providerId]),
        category: { id: cat.id, name: cat.name, icon: cat.icon, description: cat.description },
      };
    }

    result.push({
      id: conv.id,
      clientId: conv.clientId,
      providerId: conv.providerId,
      listingId: conv.listingId,
      createdAt: conv.createdAt.toISOString(),
      client: formatUser(userMap[conv.clientId]),
      provider: formatUser(userMap[conv.providerId]),
      listing: listingFormatted,
      lastMessage: lastMsgFormatted,
      unreadCount,
    });
  }

  res.json(result);
});

router.post("/conversations", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { providerId: targetUserId, listingId } = parsed.data;

  if (targetUserId === userId) {
    res.status(400).json({ error: "No puedes iniciar una conversación contigo mismo" });
    return;
  }

  // Check if conversation already exists in either direction
  const existing = await db.select().from(conversationsTable).where(
    or(
      and(eq(conversationsTable.clientId, userId), eq(conversationsTable.providerId, targetUserId)),
      and(eq(conversationsTable.clientId, targetUserId), eq(conversationsTable.providerId, userId))
    )
  );

  if (existing.length > 0) {
    const conv = existing[0];
    res.status(201).json({
      id: conv.id,
      clientId: conv.clientId,
      providerId: conv.providerId,
      listingId: conv.listingId,
      createdAt: conv.createdAt.toISOString(),
    });
    return;
  }

  // Determine proper roles based on user types
  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, targetUserId));
  if (!targetUser) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  let actualClientId = userId;
  let actualProviderId = targetUserId;

  // If target is not a provider, current user acts as the provider side
  if (targetUser.role !== "provider") {
    actualClientId = targetUserId;
    actualProviderId = userId;
  }

  const [conv] = await db.insert(conversationsTable).values({
    clientId: actualClientId,
    providerId: actualProviderId,
    listingId: listingId ?? null,
  }).returning();

  // Auto-send a first message referencing the listing
  if (listingId) {
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId));
    if (listing) {
      await db.insert(messagesTable).values({
        conversationId: conv.id,
        senderId: userId,
        content: `📌 Hola, estoy interesado/a en tu publicación: "${listing.title}"`,
      });
    }
  }

  res.status(201).json({
    id: conv.id,
    clientId: conv.clientId,
    providerId: conv.providerId,
    listingId: conv.listingId,
    createdAt: conv.createdAt.toISOString(),
  });
});

router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
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

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const isParticipant = conv && (conv.clientId === userId || conv.providerId === userId);
  const isAdminUser = currentUser?.role === "admin";
  if (!conv || (!isParticipant && !isAdminUser)) {
    res.status(403).json({ error: "Sin acceso" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  // Mark messages as read (only for participants)
  if (isParticipant) {
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(and(eq(messagesTable.conversationId, id), eq(messagesTable.isRead, false)));
  }

  const senderIds = [...new Set(messages.map(m => m.senderId))];
  let senderMap: Record<number, typeof usersTable.$inferSelect> = {};
  if (senderIds.length > 0) {
    const senders = await db.select().from(usersTable).where(inArray(usersTable.id, senderIds));
    senderMap = Object.fromEntries(senders.map(s => [s.id, s]));
  }

  res.json(messages.map(m => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
    sender: formatUser(senderMap[m.senderId]),
  })));
});

router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
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

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
  const [msgCurrentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const isMsgParticipant = conv && (conv.clientId === userId || conv.providerId === userId);
  const isMsgAdmin = msgCurrentUser?.role === "admin";
  if (!conv || (!isMsgParticipant && !isMsgAdmin)) {
    res.status(403).json({ error: "Sin acceso" });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [message] = await db.insert(messagesTable).values({
    conversationId: id,
    senderId: userId,
    content: parsed.data.content,
  }).returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  // Notify the other participant
  const recipientId = conv.clientId === userId ? conv.providerId : conv.clientId;
  const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, recipientId));

  if (recipient) {
    const baseUrl = process.env.APP_URL || "http://localhost:5173";
    const chatUrl = `${baseUrl}/mensajes/${conv.id}`;

    // Email notification
    if (recipient.notifyEmail) {
      sendEmail(
        recipient.email,
        `Nuevo mensaje de ${sender.name} - ServiMarket`,
        buildNewMessageEmail(recipient.name, sender.name, parsed.data.content, chatUrl),
      ).catch(err => logger.error({ err }, "Failed to send message email notification"));
    }
  }

  res.status(201).json({
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    isRead: message.isRead,
    createdAt: message.createdAt.toISOString(),
    sender: formatUser(sender),
  });
});

export default router;

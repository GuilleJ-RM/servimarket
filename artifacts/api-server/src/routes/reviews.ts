import { Router, type IRouter } from "express";
import { db, reviewsTable, bookingsTable, usersTable, listingsTable } from "@workspace/db";
import { eq, and, avg, count, desc, inArray } from "drizzle-orm";
import { CreateReviewBody } from "@workspace/api-zod";

const router: IRouter = Router();

// POST /reviews - Create a review for a completed booking
router.post("/reviews", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { bookingId, rating, comment } = parsed.data;

  // Validate rating range
  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "La calificación debe ser entre 1 y 5" });
    return;
  }

  // Validate booking exists and is completed/delivered
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) {
    res.status(404).json({ error: "Reserva no encontrada" });
    return;
  }

  if (booking.clientId !== userId) {
    res.status(403).json({ error: "Solo el cliente puede dejar una reseña" });
    return;
  }

  if (!["completed", "delivered"].includes(booking.status)) {
    res.status(400).json({ error: "Solo puedes calificar servicios completados o productos entregados" });
    return;
  }

  // Check if already reviewed
  const existing = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, bookingId));
  if (existing.length > 0) {
    res.status(400).json({ error: "Ya dejaste una reseña para esta reserva" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    bookingId,
    listingId: booking.listingId,
    reviewerId: userId,
    providerId: booking.providerId,
    rating,
    comment: comment ?? null,
  }).returning();

  res.status(201).json({
    id: review.id,
    bookingId: review.bookingId,
    listingId: review.listingId,
    reviewerId: review.reviewerId,
    providerId: review.providerId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  });
});

// GET /listings/:id/reviews - Get all reviews for a listing
router.get("/listings/:id/reviews", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.listingId, id))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(500);

  if (reviews.length === 0) {
    res.json([]);
    return;
  }

  const reviewerIds = [...new Set(reviews.map(r => r.reviewerId))];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, reviewerIds));
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  res.json(reviews.map(r => {
    const reviewer = userMap[r.reviewerId];
    return {
      id: r.id,
      bookingId: r.bookingId,
      listingId: r.listingId,
      reviewerId: r.reviewerId,
      providerId: r.providerId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      reviewer: reviewer ? {
        id: reviewer.id,
        name: reviewer.name,
        avatarUrl: reviewer.avatarUrl,
      } : null,
    };
  }));
});

export default router;

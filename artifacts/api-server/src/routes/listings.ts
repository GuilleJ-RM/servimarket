import { Router, type IRouter } from "express";
import { db, listingsTable, usersTable, categoriesTable } from "@workspace/db";
import { eq, and, ilike, inArray, or, desc } from "drizzle-orm";
import {
  CreateListingBody,
  UpdateListingBody,
  GetListingParams,
  UpdateListingParams,
  DeleteListingParams,
  GetListingsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatListing(l: typeof listingsTable.$inferSelect, provider: typeof usersTable.$inferSelect, category: typeof categoriesTable.$inferSelect) {
  return {
    id: l.id,
    providerId: l.providerId,
    categoryId: l.categoryId,
    title: l.title,
    description: l.description,
    type: l.type,
    price: l.price,
    imageUrl: l.imageUrl,
    images: l.images ?? [],
    whatsapp: l.whatsapp,
    paymentMethods: l.paymentMethods,
    isActive: l.isActive,
    adminApproved: l.adminApproved,
    quantity: l.quantity,
    status: l.status,
    pricingType: l.pricingType,
    weightKg: l.weightKg,
    sizes: l.sizes,
    variantLabel: l.variantLabel,
    requiresSchedule: l.requiresSchedule,
    createdAt: l.createdAt.toISOString(),
    provider: {
      id: provider.id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      phone: provider.phone,
      avatarUrl: provider.avatarUrl,
      locality: provider.locality,
      createdAt: provider.createdAt.toISOString(),
    },
    category: {
      id: category.id,
      name: category.name,
      icon: category.icon,
      type: category.type,
      description: category.description,
    },
  };
}

router.get("/listings/my", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const listings = await db.select().from(listingsTable).where(eq(listingsTable.providerId, userId)).orderBy(listingsTable.createdAt);

  if (listings.length === 0) {
    res.json([]);
    return;
  }

  const categoryIds = [...new Set(listings.map(l => l.categoryId))];
  const cats = await db.select().from(categoriesTable).where(inArray(categoriesTable.id, categoryIds));
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  res.json(listings.map(l => {
    const cat = catMap[l.categoryId];
    return {
      id: l.id,
      providerId: l.providerId,
      categoryId: l.categoryId,
      title: l.title,
      description: l.description,
      type: l.type,
      price: l.price,
      imageUrl: l.imageUrl,
      images: l.images ?? [],
      whatsapp: l.whatsapp,
      paymentMethods: l.paymentMethods,
      isActive: l.isActive,
      adminApproved: l.adminApproved,
      quantity: l.quantity,
      status: l.status,
      pricingType: l.pricingType,
      weightKg: l.weightKg,
      sizes: l.sizes,
      variantLabel: l.variantLabel,
      requiresSchedule: l.requiresSchedule,
      createdAt: l.createdAt.toISOString(),
      category: cat ? { id: cat.id, name: cat.name, icon: cat.icon, type: cat.type, description: cat.description } : null,
    };
  }));
});

router.get("/listings/featured", async (_req, res): Promise<void> => {
  // Single query: get all active+approved listings ordered by date
  const allListings = await db
    .select()
    .from(listingsTable)
    .where(and(eq(listingsTable.isActive, true), eq(listingsTable.adminApproved, true)))
    .orderBy(desc(listingsTable.createdAt));

  if (allListings.length === 0) {
    res.json([]);
    return;
  }

  // Group by category, take up to 4 per category
  const byCat: Record<number, (typeof allListings)[number][]> = {};
  for (const l of allListings) {
    if (!byCat[l.categoryId]) byCat[l.categoryId] = [];
    if (byCat[l.categoryId].length < 4) byCat[l.categoryId].push(l);
  }

  // Batch fetch providers and categories
  const providerIds = [...new Set(allListings.map(l => l.providerId))];
  const categoryIds = Object.keys(byCat).map(Number);

  const [providers, cats] = await Promise.all([
    db.select().from(usersTable).where(inArray(usersTable.id, providerIds)),
    db.select().from(categoriesTable).where(inArray(categoriesTable.id, categoryIds)),
  ]);

  const providerMap = Object.fromEntries(providers.map(p => [p.id, p]));
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  const result = cats
    .filter(cat => byCat[cat.id]?.length > 0)
    .map(cat => ({
      category: { id: cat.id, name: cat.name, icon: cat.icon, type: cat.type, description: cat.description },
      listings: byCat[cat.id].map(l => formatListing(l, providerMap[l.providerId], cat)),
    }));

  res.json(result);
});

router.get("/listings", async (req, res): Promise<void> => {
  const parsed = GetListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { categoryId, type, search, locality } = parsed.data;

  const conditions = [eq(listingsTable.isActive, true), eq(listingsTable.adminApproved, true)];
  if (categoryId) conditions.push(eq(listingsTable.categoryId, categoryId));
  if (type) conditions.push(eq(listingsTable.type, type));
  if (search) {
    conditions.push(
      or(
        ilike(listingsTable.title, `%${search}%`),
        ilike(listingsTable.description, `%${search}%`)
      )!
    );
  }

  // Join with users to filter locality at DB level
  const rows = await db
    .select({ listing: listingsTable, provider: usersTable })
    .from(listingsTable)
    .innerJoin(usersTable, eq(listingsTable.providerId, usersTable.id))
    .where(and(...conditions, locality ? eq(usersTable.locality, locality) : undefined))
    .orderBy(desc(listingsTable.createdAt));

  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const categoryIds = [...new Set(rows.map(r => r.listing.categoryId))];
  const cats = await db.select().from(categoriesTable).where(inArray(categoriesTable.id, categoryIds));
  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  res.json(rows.map(r => formatListing(r.listing, r.provider, catMap[r.listing.categoryId])));
});

router.post("/listings", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "provider") {
    res.status(403).json({ error: "Solo los proveedores pueden publicar" });
    return;
  }

  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db.insert(listingsTable).values({
    providerId: userId,
    categoryId: parsed.data.categoryId,
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    price: parsed.data.price,
    imageUrl: parsed.data.imageUrl ?? null,
    images: parsed.data.images ?? [],
    whatsapp: parsed.data.whatsapp ?? null,
    paymentMethods: parsed.data.paymentMethods,
    quantity: parsed.data.quantity ?? null,
    pricingType: parsed.data.pricingType ?? "unit",
    weightKg: parsed.data.weightKg ?? null,
    sizes: parsed.data.sizes ?? null,
    variantLabel: parsed.data.variantLabel ?? null,
    requiresSchedule: parsed.data.requiresSchedule ?? false,
  }).returning();

  res.status(201).json({
    id: listing.id,
    providerId: listing.providerId,
    categoryId: listing.categoryId,
    title: listing.title,
    description: listing.description,
    type: listing.type,
    price: listing.price,
    imageUrl: listing.imageUrl,
    images: listing.images ?? [],
    whatsapp: listing.whatsapp,
    paymentMethods: listing.paymentMethods,
    isActive: listing.isActive,
    adminApproved: listing.adminApproved,
    quantity: listing.quantity,
    status: listing.status,
    pricingType: listing.pricingType,
    weightKg: listing.weightKg,
    sizes: listing.sizes,
    variantLabel: listing.variantLabel,
    requiresSchedule: listing.requiresSchedule,
    createdAt: listing.createdAt.toISOString(),
  });
});

router.get("/listings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!listing) {
    res.status(404).json({ error: "Publicación no encontrada" });
    return;
  }

  const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, listing.providerId));
  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, listing.categoryId));

  res.json(formatListing(listing, provider, category));
});

router.patch("/listings/:id", async (req, res): Promise<void> => {
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

  const [existing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "No encontrada" });
    return;
  }
  if (existing.providerId !== userId) {
    res.status(403).json({ error: "Sin permisos" });
    return;
  }

  const parsed = UpdateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.description != null) updateData.description = parsed.data.description;
  if (parsed.data.categoryId != null) updateData.categoryId = parsed.data.categoryId;
  if (parsed.data.type != null) updateData.type = parsed.data.type;
  if (parsed.data.price != null) updateData.price = parsed.data.price;
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
  if (parsed.data.images !== undefined) updateData.images = parsed.data.images;
  if (parsed.data.whatsapp !== undefined) updateData.whatsapp = parsed.data.whatsapp;
  if (parsed.data.paymentMethods != null) updateData.paymentMethods = parsed.data.paymentMethods;
  if (parsed.data.isActive != null) updateData.isActive = parsed.data.isActive;
  if (parsed.data.quantity !== undefined) updateData.quantity = parsed.data.quantity;
  if (parsed.data.status != null) updateData.status = parsed.data.status;
  if (parsed.data.pricingType != null) updateData.pricingType = parsed.data.pricingType;
  if (parsed.data.weightKg !== undefined) updateData.weightKg = parsed.data.weightKg;
  if (parsed.data.sizes !== undefined) updateData.sizes = parsed.data.sizes;
  if (parsed.data.variantLabel !== undefined) updateData.variantLabel = parsed.data.variantLabel;
  if (parsed.data.requiresSchedule !== undefined && parsed.data.requiresSchedule !== null) updateData.requiresSchedule = parsed.data.requiresSchedule;

  const [listing] = await db.update(listingsTable).set(updateData).where(eq(listingsTable.id, id)).returning();

  res.json({
    id: listing.id,
    providerId: listing.providerId,
    categoryId: listing.categoryId,
    title: listing.title,
    description: listing.description,
    type: listing.type,
    price: listing.price,
    imageUrl: listing.imageUrl,
    images: listing.images ?? [],
    whatsapp: listing.whatsapp,
    paymentMethods: listing.paymentMethods,
    isActive: listing.isActive,
    adminApproved: listing.adminApproved,
    quantity: listing.quantity,
    status: listing.status,
    pricingType: listing.pricingType,
    weightKg: listing.weightKg,
    sizes: listing.sizes,
    variantLabel: listing.variantLabel,
    requiresSchedule: listing.requiresSchedule,
    createdAt: listing.createdAt.toISOString(),
  });
});

router.delete("/listings/:id", async (req, res): Promise<void> => {
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

  const [existing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
  if (!existing || existing.providerId !== userId) {
    res.status(403).json({ error: "Sin permisos" });
    return;
  }

  await db.delete(listingsTable).where(eq(listingsTable.id, id));
  res.json({ success: true });
});

export default router;

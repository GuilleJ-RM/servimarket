import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody, ForgotPasswordBody, ResetPasswordBody, UpdateProfileBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { sendEmail, buildPasswordResetEmail } from "../lib/email";

const router: IRouter = Router();

function serializeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    locality: user.locality,
    whatsapp: user.whatsapp,
    notifyEmail: user.notifyEmail,
    companyName: user.companyName,
    cuit: user.cuit,
    companyAddress: user.companyAddress,
    companyIndustry: user.companyIndustry,
    companyApproved: user.companyApproved,
    cvUrl: user.cvUrl,
    cvPublic: user.cvPublic,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, role, phone, locality } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "El email ya está registrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const insertData: Record<string, unknown> = {
    name,
    email,
    passwordHash,
    role,
    phone: phone ?? null,
    locality: locality ?? null,
  };

  // Company-specific fields
  if (role === "company") {
    const { companyName, cuit, companyAddress, companyIndustry } = parsed.data as any;
    if (!companyName || !cuit) {
      res.status(400).json({ error: "Nombre de empresa y CUIT son obligatorios" });
      return;
    }
    insertData.companyName = companyName;
    insertData.cuit = cuit;
    insertData.companyAddress = companyAddress ?? null;
    insertData.companyIndustry = companyIndustry ?? null;
    insertData.companyApproved = false;
  }

  const [user] = await db.insert(usersTable).values(insertData as any).returning();

  req.session = { userId: user.id };
  res.status(201).json({ user: serializeUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  req.session = { userId: user.id };
  res.json({ user: serializeUser(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session = null;
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  res.json(serializeUser(user));
});

// ── Update profile ──────────────────────────────────────────────────
router.patch("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.name !== undefined && data.name !== null) updates.name = data.name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
  if (data.locality !== undefined) updates.locality = data.locality;
  if (data.whatsapp !== undefined) updates.whatsapp = data.whatsapp;
  if (data.notifyEmail !== undefined && data.notifyEmail !== null) updates.notifyEmail = data.notifyEmail;
  if ((data as any).cvUrl !== undefined) updates.cvUrl = (data as any).cvUrl;
  if ((data as any).cvPublic !== undefined) updates.cvPublic = (data as any).cvPublic;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No hay campos para actualizar" });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();

  res.json(serializeUser(updated));
});

// ── Forgot password ─────────────────────────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({ success: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(usersTable).set({
    resetTokenHash: tokenHash,
    resetTokenExpiry: expiry,
  }).where(eq(usersTable.id, user.id));

  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  const resetUrl = `${baseUrl}/restablecer-password?token=${token}&email=${encodeURIComponent(email)}`;

  await sendEmail(
    user.email,
    "Restablecer contraseña - ServiMarket",
    buildPasswordResetEmail(user.name, resetUrl),
  );

  logger.info({ userId: user.id }, "Password reset token generated");
  res.json({ success: true });
});

// ── Reset password ──────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, token, newPassword } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || user.resetTokenHash !== tokenHash || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    res.status(400).json({ error: "Token inválido o expirado" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({
    passwordHash,
    resetTokenHash: null,
    resetTokenExpiry: null,
  }).where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id }, "Password reset successful");
  res.json({ success: true });
});

export default router;

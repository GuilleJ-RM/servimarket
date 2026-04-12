import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { db, usersTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { RegisterBody, LoginBody, ForgotPasswordBody, ResetPasswordBody, UpdateProfileBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { sendEmail, buildPasswordResetEmail, buildEmailVerificationEmail } from "../lib/email";

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Demasiados intentos, intente de nuevo en 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

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
    emailVerified: user.emailVerified,
    companyName: user.companyName,
    cuit: user.cuit,
    companyAddress: user.companyAddress,
    companyIndustry: user.companyIndustry,
    companyApproved: user.companyApproved,
    cvUrl: user.cvUrl,
    cvPublic: user.cvPublic,
    cvCategories: user.cvCategories,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, password, role, phone, locality } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    res.status(400).json({ error: "El email no es válido" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    return;
  }

  if (phone && (phone.length < 6 || phone.length > 20)) {
    res.status(400).json({ error: "El teléfono debe tener entre 6 y 20 caracteres" });
    return;
  }

  const existing = await db.select().from(usersTable).where(ilike(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "No se pudo completar el registro. Si ya tenés cuenta, intentá iniciar sesión." });
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

  // Send email verification
  const verificationToken = crypto.randomBytes(32).toString("hex");
  await db.update(usersTable).set({ verificationToken }).where(eq(usersTable.id, user.id));
  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  const verifyUrl = `${baseUrl}/verificar-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
  logger.info({ to: user.email, subject: "Verificá tu email - Mil Laburos" }, "Intentando enviar email de verificación");
  sendEmail(
    user.email,
    "Verificá tu email - Mil Laburos",
    buildEmailVerificationEmail(user.name, verifyUrl),
  ).catch(err => logger.error({ err }, "Failed to send verification email"));

  req.session = { userId: user.id };
  res.status(201).json({ user: serializeUser(user) });
});


router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const { password } = parsed.data;

  if (email.length > 254) {
    res.status(400).json({ error: "Email inválido" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(ilike(usersTable.email, email));

  // Always run bcrypt.compare to prevent timing-based user enumeration
  const dummyHash = "$2a$10$0000000000000000000000000000000000000000000000000000";
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  req.session = { userId: user.id };
  // Log para depuración de sesión y cookies
  logger.info({
    userId: user.id,
    cookiesIn: req.headers.cookie,
    session: req.session,
    setCookieHeader: res.getHeader("Set-Cookie"),
    env: process.env.NODE_ENV,
  }, "Login exitoso, sesión creada y cookie enviada");
  res.json({ user: serializeUser(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session = null;
  res.json({ success: true });
});


router.get("/auth/me", async (req, res): Promise<void> => {
  logger.info({
    cookiesIn: req.headers.cookie,
    session: req.session,
  }, "Consulta a /auth/me");
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
  if ((data as any).cvCategories !== undefined) updates.cvCategories = (data as any).cvCategories;
  if ((data as any).companyName !== undefined) updates.companyName = (data as any).companyName;
  if ((data as any).cuit !== undefined) updates.cuit = (data as any).cuit;
  if ((data as any).companyAddress !== undefined) updates.companyAddress = (data as any).companyAddress;
  if ((data as any).companyIndustry !== undefined) updates.companyIndustry = (data as any).companyIndustry;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No hay campos para actualizar" });
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();

  res.json(serializeUser(updated));
});

// ── Verify email ────────────────────────────────────────────────────
router.post("/auth/verify-email", authLimiter, async (req, res): Promise<void> => {
  const { email, token } = req.body;
  if (!email || typeof email !== "string" || !token || typeof token !== "string") {
    res.status(400).json({ error: "Email y token son obligatorios" });
    return;
  }
  if (email.length > 254 || token.length > 128) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(ilike(usersTable.email, email.toLowerCase()));
  if (!user || user.verificationToken !== token) {
    res.status(400).json({ error: "Token inválido o expirado" });
    return;
  }

  await db.update(usersTable).set({
    emailVerified: true,
    verificationToken: null,
  }).where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id }, "Email verified");
  res.json({ success: true });
});

// ── Resend verification email ───────────────────────────────────────
router.post("/auth/resend-verification", authLimiter, async (req, res): Promise<void> => {
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

  if (user.emailVerified) {
    res.json({ success: true });
    return;
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  await db.update(usersTable).set({ verificationToken }).where(eq(usersTable.id, user.id));

  const baseUrl = process.env.APP_URL || "http://localhost:5173";
  const verifyUrl = `${baseUrl}/verificar-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

  logger.info({ to: user.email, subject: "Verificá tu email - Mil Laburos" }, "Intentando reenviar email de verificación");
  await sendEmail(
    user.email,
    "Verificá tu email - Mil Laburos",
    buildEmailVerificationEmail(user.name, verifyUrl),
  );

  logger.info({ userId: user.id }, "Verification email resent");
  res.json({ success: true });
});

// ── Forgot password ─────────────────────────────────────────────────
router.post("/auth/forgot-password", authLimiter, async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const [user] = await db.select().from(usersTable).where(ilike(usersTable.email, email));

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

  logger.info({ to: user.email, subject: "Restablecer contraseña - Mil Laburos" }, "Intentando enviar email de restablecimiento de contraseña");
  await sendEmail(
    user.email,
    "Restablecer contraseña - Mil Laburos",
    buildPasswordResetEmail(user.name, resetUrl),
  );

  logger.info({ userId: user.id }, "Password reset token generated");
  res.json({ success: true });
});

// ── Reset password ──────────────────────────────────────────────────
router.post("/auth/reset-password", authLimiter, async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { token, newPassword } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [user] = await db.select().from(usersTable).where(ilike(usersTable.email, email));
  // Always perform timing-safe comparison to prevent timing-based enumeration
  const dummyHash = "0".repeat(64);
  const tokenMatch = crypto.timingSafeEqual(
    Buffer.from(user?.resetTokenHash ?? dummyHash, "hex"),
    Buffer.from(tokenHash, "hex")
  );
  if (!user || !user.resetTokenHash || !tokenMatch || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
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

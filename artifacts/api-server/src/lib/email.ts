import * as nodemailer from "nodemailer";
import { logger } from "./logger";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP not configured — email sending disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    logger.warn({ to, subject }, "Email not sent (SMTP not configured)");
    return false;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await t.sendMail({ from, to, subject, html });
    logger.info({ to, subject }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
    return false;
  }
}

export function buildPasswordResetEmail(name: string, resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #E67E22;">Mil Laburos</h2>
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #E67E22; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
           Restablecer contraseña
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este mensaje.</p>
    </div>
  `;
}

export function buildNewMessageEmail(recipientName: string, senderName: string, messagePreview: string, chatUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #E67E22;">Mil Laburos</h2>
      <p>Hola <strong>${escapeHtml(recipientName)}</strong>,</p>
      <p><strong>${escapeHtml(senderName)}</strong> te envió un mensaje:</p>
      <blockquote style="border-left: 3px solid #E67E22; padding-left: 12px; color: #555;">
        ${escapeHtml(messagePreview.length > 200 ? messagePreview.slice(0, 200) + "..." : messagePreview)}
      </blockquote>
      <p>
        <a href="${chatUrl}"
           style="display: inline-block; padding: 12px 24px; background: #E67E22; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
           Ver conversación
        </a>
      </p>
    </div>
  `;
}

export function buildEmailVerificationEmail(name: string, verifyUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #E67E22;">Mil Laburos</h2>
      <p>Hola <strong>${escapeHtml(name)}</strong>,</p>
      <p>Gracias por registrarte en Mil Laburos. Por favor verificá tu email haciendo clic en el siguiente botón:</p>
      <p>
        <a href="${verifyUrl}"
           style="display: inline-block; padding: 12px 24px; background: #E67E22; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
           Verificar email
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">Si no creaste esta cuenta, ignorá este mensaje.</p>
    </div>
  `;
}

export function buildNewBookingEmail(providerName: string, clientName: string, listingTitle: string, bookingUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #E67E22;">Mil Laburos</h2>
      <p>Hola <strong>${escapeHtml(providerName)}</strong>,</p>
      <p>¡Tenés un nuevo pedido! <strong>${escapeHtml(clientName)}</strong> solicitó tu publicación:</p>
      <blockquote style="border-left: 3px solid #E67E22; padding-left: 12px; color: #555; font-weight: bold;">
        ${escapeHtml(listingTitle)}
      </blockquote>
      <p>
        <a href="${bookingUrl}"
           style="display: inline-block; padding: 12px 24px; background: #E67E22; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
           Ver pedido
        </a>
      </p>
    </div>
  `;
}

import * as nodemailer from "nodemailer";
import { logger } from "./logger";

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
      <h2 style="color: #6366f1;">ServiMarket</h2>
      <p>Hola <strong>${name}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
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
      <h2 style="color: #6366f1;">ServiMarket</h2>
      <p>Hola <strong>${recipientName}</strong>,</p>
      <p><strong>${senderName}</strong> te envió un mensaje:</p>
      <blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; color: #555;">
        ${messagePreview.length > 200 ? messagePreview.slice(0, 200) + "..." : messagePreview}
      </blockquote>
      <p>
        <a href="${chatUrl}"
           style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
           Ver conversación
        </a>
      </p>
    </div>
  `;
}

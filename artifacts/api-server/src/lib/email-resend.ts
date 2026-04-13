import { Resend } from 'resend';
import { logger } from './logger';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM;

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!resendApiKey) {
    logger.warn('Resend API key not configured — email sending disabled');
    return null;
  }
  if (!resend) {
    resend = new Resend(resendApiKey);
  }
  return resend;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const r = getResend();
  if (!r) {
    logger.warn({ to, subject }, 'Email not sent (Resend not configured)');
    return false;
  }
  if (!resendFrom) {
    logger.error({ to, subject }, 'Resend FROM address not configured');
    throw new Error('Resend FROM address not configured');
  }
  try {
    await r.emails.send({ from: resendFrom, to, subject, html });
    logger.info({ to, subject }, 'Email sent (Resend)');
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email (Resend)');
    return false;
  }
}

import { Resend } from "resend";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

export const resendApiKey = defineSecret("RESEND_API_KEY");

const FROM_EMAIL = "Bere Cárdenas Cosmetología <cursos@berecardenascosmetologia.com.mx>";
const SITE_URL = "https://berecardenascosmetologia.com.mx";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailParams): Promise<void> {
  const apiKey = resendApiKey.value();
  if (!apiKey) {
    logger.warn(`RESEND_API_KEY no está configurada; no se envió el correo "${subject}" a ${to}.`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html, attachments });
    logger.info(`Correo "${subject}" enviado a ${to}.`);
  } catch (error) {
    // Un fallo de correo nunca debe interrumpir el flujo de negocio que lo dispara (pago, constancia, etc.)
    logger.error(`Error enviando el correo "${subject}" a ${to}:`, error);
  }
}

// Plantilla visual de marca (dorado/negro) reutilizada por todos los correos automáticos del sitio.
export function renderBrandedEmail({
  heading,
  bodyHtml,
  ctaText,
  ctaUrl,
}: {
  heading: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `
<div style="background-color:#f4f4f3;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="background-color:#121212;padding:32px;text-align:center;">
      <img src="${SITE_URL}/logo_blanco.png" alt="Bere Cárdenas Cosmetología" width="180" style="display:block;margin:0 auto;border:0;" />
    </div>
    <div style="padding:40px 36px;">
      <h1 style="margin:0 0 18px;font-size:23px;line-height:1.3;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;">${heading}</h1>
      <div style="font-size:15px;line-height:1.7;color:#4a4a4a;">
        ${bodyHtml}
      </div>
      <div style="text-align:center;margin-top:32px;">
        <a href="${ctaUrl}" style="display:inline-block;background-color:#D4AF37;color:#121212;font-weight:bold;padding:15px 36px;border-radius:999px;text-decoration:none;font-size:15px;">${ctaText}</a>
      </div>
    </div>
    <div style="background-color:#faf8f3;padding:24px 32px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0 0 6px;font-size:13px;color:#8a8a8a;">Bere Cárdenas Cosmetología Integral</p>
      <p style="margin:0;font-size:12px;color:#b0b0b0;">
        <a href="https://wa.me/523316942473" style="color:#b8952e;text-decoration:none;">WhatsApp</a>
        &nbsp;·&nbsp;
        <a href="https://www.instagram.com/bere.cardenas_cosmetologia" style="color:#b8952e;text-decoration:none;">Instagram</a>
      </p>
    </div>
  </div>
</div>`;
}

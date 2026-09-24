import { Resend } from "resend";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

export const resendApiKey = defineSecret("RESEND_API_KEY");

const FROM_EMAIL = "Bere Cárdenas Cosmetología <cursos@berecardenascosmetologia.com.mx>";

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

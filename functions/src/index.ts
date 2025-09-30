import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { defineString } from "firebase-functions/params";

admin.initializeApp();

// Lee el secreto de la forma v2
const mercadopagoAccessToken = defineString("MERCADOPAGO_ACCESS_TOKEN");

const client = new MercadoPagoConfig({
  accessToken: mercadopagoAccessToken.value(),
});

interface CourseData {
  courseId: string;
  title: string;
  price: number;
}

// Esta es la sintaxis v2 que el error te pide
export const createPaymentPreference = onCall<CourseData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError( "unauthenticated", "Debes iniciar sesión.");
  }

  const { courseId, title, price } = request.data;
  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;

  if (!userEmail) {
    throw new HttpsError("invalid-argument", "El usuario no tiene un email asociado.");
  }

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [ { id: courseId, title, unit_price: Number(price), quantity: 1 } ],
        payer: { email: userEmail },
        back_urls: {
          success: "https://bere-cardenas-page.netlify.app/mis-cursos",
          failure: `https://bere-cardenas-page.netlify.app/cursos/${courseId}`,
          pending: "https://bere-cardenas-page.netlify.app/mis-cursos",
        },
        auto_return: "approved",
        external_reference: `${userId}_${courseId}`,
        notification_url: `https://us-central1-proyecto-bere.cloudfunctions.net/paymentWebhook`,
      },
    });

    logger.info(`Preferencia creada con ID: ${result.id}`);
    return { id: result.id };
  } catch (error) {
    logger.error("Error al crear la preferencia de pago:", error);
    throw new HttpsError("internal", "No se pudo crear la preferencia de pago.");
  }
});

export const paymentWebhook = onRequest(async (request, response) => {
    if (request.method !== "POST") {
        response.status(405).send("Método no permitido");
        return;
    }
    logger.info("Webhook recibido:", request.body);
    response.status(200).send("OK");
});
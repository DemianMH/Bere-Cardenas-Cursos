// RUTA: functions/src/index.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { defineString } from "firebase-functions/params";

admin.initializeApp();
const db = admin.firestore();

const mercadopagoAccessToken = defineString("MERCADOPAGO_ACCESS_TOKEN");

// --- NUEVA FUNCIÓN PARA ASIGNAR ROL DE DOCENTE ---
export const addAdminRole = onCall({ cors: true }, async (request) => {
  // Esta función es para uso administrativo. En un futuro se puede proteger.
  const { email } = request.data;
  if (!email) {
    throw new HttpsError('invalid-argument', 'Se necesita un email.');
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { rol: 'docente' });
    // También actualizamos Firestore para consistencia
    await db.collection('users').doc(user.uid).set({ rol: 'docente' }, { merge: true });
    logger.info(`Rol 'docente' asignado a ${email}`);
    return { message: `Éxito! El rol 'docente' fue asignado a ${email}` };
  } catch (error) {
    logger.error("Error al asignar rol de admin:", error);
    throw new HttpsError('internal', 'Error al asignar el rol.');
  }
});


export const createPaymentPreference = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const client = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken.value() });
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
        items: [{ id: courseId, title, unit_price: Number(price), quantity: 1 }],
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

// --- FUNCIÓN MANAGEUSER MODIFICADA ---
export const manageUser = onCall({ cors: true }, async (request) => {
  // Ahora verificamos el custom claim 'rol' en el token
  if (request.auth?.token.rol !== 'docente') {
    throw new HttpsError('permission-denied', 'Solo los docentes pueden realizar esta acción.');
  }

  const { action, data } = request.data;

  try {
    switch (action) {
      case 'listUsers': {
        const userRecords = await admin.auth().listUsers();
        const users = userRecords.users.map((user) => ({
          uid: user.uid,
          email: user.email,
          nombre: user.displayName || '',
        }));
        return { success: true, users };
      }
      case 'updateUser': {
        const { uid, email, nombre, password } = data;
        const updateData: { email?: string; displayName?: string; password?: string } = {};
        if (email) updateData.email = email;
        if (nombre) updateData.displayName = nombre;
        if (password) updateData.password = password;

        await admin.auth().updateUser(uid, updateData);
        if (nombre || email) {
            const firestoreUpdate: {nombre?: string, email?: string} = {};
            if (nombre) firestoreUpdate.nombre = nombre;
            if (email) firestoreUpdate.email = email;
            await db.collection('users').doc(uid).update(firestoreUpdate);
        }
        return { success: true, message: 'Usuario actualizado correctamente.' };
      }
      case 'createUser': {
        const { email, password, nombre } = data;
        const userRecord = await admin.auth().createUser({ email, password, displayName: nombre });
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          nombre: nombre,
          email: email,
          rol: 'estudiante',
          cursosInscritos: []
        });
        return { success: true, user: { uid: userRecord.uid, email, nombre } };
      }
      case 'deleteUser': {
        const { uid } = data;
        await admin.auth().deleteUser(uid);
        await db.collection('users').doc(uid).delete();
        return { success: true, message: 'Usuario eliminado correctamente.' };
      }
      default:
        throw new HttpsError('invalid-argument', 'Acción no válida.');
    }
  } catch (error: any) {
    logger.error('Error en manageUser:', error);
    throw new HttpsError('internal', error.message || 'Ocurrió un error en el servidor.');
  }
});

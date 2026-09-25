import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onDocumentDeleted, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { defineString } from "firebase-functions/params";
import { sendEmail, renderBrandedEmail, resendApiKey } from "./email";
import { generateCertificatePdf } from "./certificate";
import { randomUUID } from "crypto";

admin.initializeApp();

const db = admin.firestore();

const mercadopagoAccessToken = defineString("MERCADOPAGO_ACCESS_TOKEN");
const SITE_URL = "https://berecardenascosmetologia.com.mx";

function extractStoragePathFromUrl(url: string): string | null {
  const match = url.match(/\/o\/(.+?)\?/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

interface Coupon {
  id?: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  createdAt?: admin.firestore.Timestamp;
}

const requireAuth = (context: any) => {
  if (!context.auth || !context.auth.uid) {
    logger.warn('Intento no autenticado.');
    throw new HttpsError('unauthenticated', 'Se requiere autenticación para esta acción.');
  }
};

const requireDocenteRole = (context: any) => {
  requireAuth(context);
  if (!context.auth.token || context.auth.token.rol !== 'docente') {
    logger.warn(`Intento no autorizado por UID: ${context.auth.uid}`);
    throw new HttpsError('permission-denied', 'Se requiere rol de docente para esta acción.');
  }
};

export const addAdminRole = onCall(async (request) => {
  const { email } = request.data;
  
  try {
    requireDocenteRole(request);
    
    if (!email || typeof email !== 'string') {
      throw new HttpsError('invalid-argument', 'Se necesita un email válido.');
    }
    
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(userRecord.uid, { rol: 'docente' });
    await db.collection('users').doc(userRecord.uid).set({ rol: 'docente' }, { merge: true });
    
    logger.info(`Rol 'docente' asignado a ${email}`);
    return { success: true, message: `Éxito! El rol 'docente' fue asignado a ${email}` };
  
  } catch (error: any) {
    logger.error("Error al asignar rol de admin:", error);
    if (error instanceof HttpsError) throw error; 
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', `No se encontró usuario con email ${email}.`);
    }
    throw new HttpsError('internal', error.message || 'Error interno al asignar rol.');
  }
});

export const manageCoupons = onCall(async (request) => {
  try {
    requireDocenteRole(request);
    const { action, data } = request.data;
    const couponsCollection = db.collection('coupons');
    
    switch (action) {
      case 'listCoupons': {
        const snapshot = await couponsCollection.orderBy('createdAt', 'desc').get();
        const coupons = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return { success: true, coupons };
      }
      case 'createCoupon': {
        const { code, discountPercentage } = data as Coupon;
        if (!code || typeof code !== 'string' || code.trim().length < 3) {
          throw new HttpsError('invalid-argument', 'Código inválido (mín 3 caracteres).');
        }
        const cleanCode = code.trim().toUpperCase();
        if (typeof discountPercentage !== 'number' || discountPercentage <= 0 || discountPercentage > 100) {
          throw new HttpsError('invalid-argument', 'Porcentaje debe ser entre 1 y 100.');
        }
        const existingCoupon = await couponsCollection.where('code', '==', cleanCode).limit(1).get();
        if (!existingCoupon.empty) {
          throw new HttpsError('already-exists', `Ya existe cupón: "${cleanCode}".`);
        }
        const newCouponData: Coupon = {
          code: cleanCode,
          discountPercentage,
          active: true,
          createdAt: admin.firestore.Timestamp.now(),
        };
        const docRef = await couponsCollection.add(newCouponData);
        return { success: true, coupon: { id: docRef.id, ...newCouponData } };
      }
      case 'deleteCoupon': {
        const { id } = data;
        if (!id || typeof id !== 'string') {
          throw new HttpsError('invalid-argument', 'ID de cupón inválido.');
        }
        await couponsCollection.doc(id).delete();
        return { success: true, message: 'Cupón eliminado.' };
      }
      case 'toggleCouponStatus': {
        const { id, active } = data;
        if (!id || typeof id !== 'string' || typeof active !== 'boolean') {
          throw new HttpsError('invalid-argument', 'Datos inválidos para cambiar estado.');
        }
        await couponsCollection.doc(id).update({ active });
        return { success: true, message: `Cupón ${active ? 'activado' : 'desactivado'}.` };
      }
      default:
        throw new HttpsError('invalid-argument', 'Acción no válida.');
    }
  } catch (error: any) {
    logger.error(`Error en manageCoupons:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Error interno del servidor.');
  }
});

export const createPaymentPreference = onCall(async (request) => {
  try {
    requireAuth(request);
    const userId = request.auth!.uid;
    const userRecord = await admin.auth().getUser(userId);
    const userEmail = userRecord.email;
    
    if (!userEmail) {
      throw new HttpsError('invalid-argument', "Email del usuario no encontrado en el token.");
    }

    const { courseId, title, price, couponCode } = request.data;
    if (!courseId || !title || typeof price !== 'number' || price <= 0) {
      throw new HttpsError('invalid-argument', "Datos del curso inválidos proporcionados.");
    }

    let finalPrice = Number(price);
    let appliedCouponCode: string | null = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const cleanCouponCode = couponCode.trim().toUpperCase();
      const couponQuery = await db.collection('coupons').where('code', '==', cleanCouponCode).where('active', '==', true).limit(1).get();

      if (!couponQuery.empty) {
        const couponData = couponQuery.docs[0].data() as Coupon;
        const discount = couponData.discountPercentage / 100;
        finalPrice = finalPrice * (1 - discount);
        appliedCouponCode = couponData.code;
        logger.info(`Cupón ${appliedCouponCode} aplicado para ${userId}. Precio final: ${finalPrice}`);
      } else {
        logger.warn(`Intento de uso de cupón inválido "${cleanCouponCode}" por usuario ${userId}.`);
        throw new HttpsError('not-found', `El cupón "${cleanCouponCode}" no es válido o ha expirado.`);
      }
    }

    finalPrice = Math.max(finalPrice, 1);

    const client = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken.value() });
    const preference = new Preference(client);

    const preferenceBody = {
      items: [{
        id: courseId,
        title: `${title}${appliedCouponCode ? ` (Cupón: ${appliedCouponCode})` : ''}`,
        unit_price: Math.round(finalPrice * 100) / 100,
        quantity: 1,
        currency_id: 'MXN'
      }],
      payer: { email: userEmail },
      back_urls: {
        success: "https://berecardenascosmetologia.com.mx/mis-cursos",
        failure: `https://berecardenascosmetologia.com.mx/cursos/${courseId}`,
        pending: "https://berecardenascosmetologia.com.mx/mis-cursos"
      },
      auto_return: "approved",
      external_reference: `${userId}_${courseId}`,
      notification_url: `https://us-central1-proyecto-bere.cloudfunctions.net/paymentWebhook`,
      metadata: {
        coupon_code: appliedCouponCode,
        user_id: userId,
        course_id: courseId
      }
    };

    const result = await preference.create({ body: preferenceBody });
    logger.info(`Preferencia de pago ${result.id} creada para usuario ${userId}, curso ${courseId}. Precio final: ${finalPrice}`);
    return { id: result.id };

  } catch (error: any) {
    logger.error("Error al crear preferencia de Mercado Pago:", error.message, error?.cause);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', "Error al crear la preferencia de pago.", error.message);
  }
});

export const manageUser = onCall(async (request) => {
  try {
    requireDocenteRole(request);
    const { action, data } = request.data;
    
    switch (action) {
      case 'listUsers': {
        const listUsersResult = await admin.auth().listUsers(1000);
        const users = listUsersResult.users.map(user => ({
          uid: user.uid,
          email: user.email,
          nombre: user.displayName || user.email,
        }));
        return { success: true, users };
      }
      case 'updateUser': {
        const { uid, nombre, email, password } = data;
        if (!uid) {
          throw new HttpsError('invalid-argument', 'UID es requerido.');
        }
        
        const updatePayload: admin.auth.UpdateRequest = {};
        if (nombre) updatePayload.displayName = nombre;
        if (email) updatePayload.email = email;
        if (password) updatePayload.password = password;

        if (Object.keys(updatePayload).length > 0) {
          await admin.auth().updateUser(uid, updatePayload);
        }
        
        const firestoreUpdate: { nombre?: string, email?: string } = {};
        if (nombre) firestoreUpdate.nombre = nombre;
        if (email) firestoreUpdate.email = email;

        if (Object.keys(firestoreUpdate).length > 0) {
             await db.collection('users').doc(uid).set(firestoreUpdate, { merge: true });
        }
        
        logger.info(`Usuario ${uid} actualizado.`);
        return { success: true, message: 'Usuario actualizado.' };
      }
      case 'deleteUser': {
        const { uid } = data;
        if (!uid) {
          throw new HttpsError('invalid-argument', 'UID es requerido.');
        }
        await admin.auth().deleteUser(uid);
        await db.collection('users').doc(uid).delete();
        logger.info(`Usuario ${uid} eliminado de Auth.`);
        return { success: true, message: 'Usuario eliminado.' };
      }
      default:
        logger.warn(`Acción desconocida recibida en manageUser: ${action}`);
        throw new HttpsError('invalid-argument', 'Acción no válida.');
    }
  } catch (error: any) {
    logger.error(`Error no capturado en el switch de manageUser:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Error interno del servidor.');
  }
});

export const paymentWebhook = onRequest({ secrets: [resendApiKey] }, async (request, response) => {
  const paymentId = request.body?.data?.id;
  const paymentType = request.body?.type;

  if (paymentType === 'payment' && paymentId) {
    try {
      const client = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken.value() });
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: paymentId });

      logger.info("Pago obtenido:", JSON.stringify(paymentInfo));

      if (paymentInfo.status === 'approved') {
        const externalReference = paymentInfo.external_reference;
        if (externalReference && typeof externalReference === 'string') {
          const [userId, courseId] = externalReference.split('_');
          if (userId && courseId) {
            const userDocRef = db.collection('users').doc(userId);
            await userDocRef.set({
              cursosInscritos: admin.firestore.FieldValue.arrayUnion(courseId)
            }, { merge: true });
            
            logger.info(`Acceso concedido a curso ${courseId} para usuario ${userId} por pago ${paymentId}`);

            await db.collection('payments').doc(paymentId).set({
              userId: userId,
              courseId: courseId,
              paymentInfo: paymentInfo,
              status: 'approved',
              processedAt: admin.firestore.Timestamp.now()
            }, { merge: true });

            try {
              const [userRecord, courseSnap] = await Promise.all([
                admin.auth().getUser(userId),
                db.collection('courses').doc(courseId).get(),
              ]);
              const courseTitle = courseSnap.data()?.title || 'tu curso';
              if (userRecord.email) {
                await sendEmail({
                  to: userRecord.email,
                  subject: `Ya tienes acceso a "${courseTitle}" 🎉`,
                  html: renderBrandedEmail({
                    heading: `¡Bienvenida a ${courseTitle}!`,
                    bodyHtml: `<p>¡Gracias por tu compra! Tu pago fue confirmado y ya tienes acceso completo al curso.</p><p>Inicia sesión cuando quieras para comenzar a aprender a tu ritmo.</p>`,
                    ctaText: 'Iniciar Sesión',
                    ctaUrl: `${SITE_URL}/login`,
                  }),
                });
              }
            } catch (emailError) {
              logger.error('No se pudo enviar el correo de acceso tras el pago:', emailError);
            }

          } else {
            logger.error("Referencia externa inválida:", externalReference);
          }
        } else {
          logger.error("Referencia externa no encontrada o inválida en el pago:", paymentId);
        }
      } else {
        logger.warn(`Pago ${paymentId} no aprobado, estado: ${paymentInfo.status}`);
        if (paymentInfo.external_reference && typeof paymentInfo.external_reference === 'string') {
          const [userId, courseId] = paymentInfo.external_reference.split('_');
          if (userId && courseId) {
            await db.collection('payments').doc(paymentId).set({
              userId: userId,
              courseId: courseId,
              paymentInfo: paymentInfo,
              status: paymentInfo.status,
              processedAt: admin.firestore.Timestamp.now()
            }, { merge: true });
          }
        }
      }
      response.status(200).send('OK');
    } catch (error: any) {
      logger.error('Error procesando webhook de MP:', error);
      response.status(500).send('Webhook Error');
    }
  } else {
    logger.info('Webhook recibido no es de tipo payment o falta ID:', request.body);
    response.status(200).send('OK');
  }
});

export const updateLessonOrder = onCall(async (request) => {
  try {
    requireDocenteRole(request);
    const { courseId, updates } = request.data;

    if (!courseId || typeof courseId !== 'string' || !Array.isArray(updates)) {
      throw new HttpsError('invalid-argument', 'Datos de actualización inválidos.');
    }

    const batch = db.batch();
    const lessonsRef = db.collection(`courses/${courseId}/lessons`);

    for (const update of updates) {
      if (update.id && typeof update.order === 'number') {
        const lessonDocRef = lessonsRef.doc(update.id);
        batch.update(lessonDocRef, { order: update.order });
      }
    }

    await batch.commit();
    logger.info(`Orden de lecciones actualizado en el curso ${courseId}.`);
    return { success: true, message: 'Orden de lecciones actualizado con éxito.' };
  } catch (error: any) {
    logger.error(`Error al actualizar el orden de lecciones:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Error interno al actualizar el orden.');
  }
});

export const deleteCourse = onCall(async (request) => {
  try {
    requireDocenteRole(request);
    const { courseId } = request.data;
    if (!courseId || typeof courseId !== 'string') {
      throw new HttpsError('invalid-argument', 'ID de curso inválido.');
    }

    const courseRef = db.collection('courses').doc(courseId);
    const courseSnap = await courseRef.get();
    if (!courseSnap.exists) {
      throw new HttpsError('not-found', 'El curso ya no existe.');
    }
    const courseData = courseSnap.data();

    const lessonsSnapshot = await db.collection(`courses/${courseId}/lessons`).get();
    const batch = db.batch();
    lessonsSnapshot.docs.forEach((lessonDoc) => batch.delete(lessonDoc.ref));
    batch.delete(courseRef);
    await batch.commit();

    const bucket = admin.storage().bucket();
    try {
      await bucket.deleteFiles({ prefix: `courses/${courseId}/` });
    } catch (storageError) {
      logger.warn(`No se pudieron borrar todos los archivos de Storage del curso ${courseId}:`, storageError);
    }

    const coverPath = courseData?.imageUrl ? extractStoragePathFromUrl(courseData.imageUrl) : null;
    if (coverPath) {
      await bucket.file(coverPath).delete().catch((err) =>
        logger.warn(`No se pudo borrar la imagen de portada del curso ${courseId}:`, err)
      );
    }

    logger.info(`Curso ${courseId} y su temario (${lessonsSnapshot.size} lecciones) eliminados por ${request.auth!.uid}.`);
    return { success: true, message: 'Curso eliminado con éxito.' };
  } catch (error: any) {
    logger.error('Error al eliminar el curso:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Error interno al eliminar el curso.');
  }
});

// Limpieza de respaldo: si algún curso se borra directamente desde Firestore (fuera de deleteCourse),
// igual eliminamos su subcolección de lecciones para no dejar datos huérfanos.
export const onCourseDeletedCleanup = onDocumentDeleted('courses/{courseId}', async (event) => {
  const { courseId } = event.params;
  try {
    const lessonsSnapshot = await db.collection(`courses/${courseId}/lessons`).get();
    if (lessonsSnapshot.empty) return;
    const batch = db.batch();
    lessonsSnapshot.docs.forEach((lessonDoc) => batch.delete(lessonDoc.ref));
    await batch.commit();
    logger.info(`Limpieza automática: ${lessonsSnapshot.size} lecciones huérfanas eliminadas del curso ${courseId}.`);
  } catch (error) {
    logger.error(`Error en la limpieza automática de lecciones del curso ${courseId}:`, error);
  }
});

export const onTransferRequestConfirmed = onDocumentUpdated(
  { document: 'transferRequests/{requestId}', secrets: [resendApiKey] },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status || after.status !== 'confirmed') return;

    try {
      const userRecord = await admin.auth().getUser(after.userId);
      if (!userRecord.email) return;
      const courseTitle = after.courseTitle || 'tu curso';
      await sendEmail({
        to: userRecord.email,
        subject: `Ya tienes acceso a "${courseTitle}" 🎉`,
        html: renderBrandedEmail({
          heading: `¡Bienvenida a ${courseTitle}!`,
          bodyHtml: `<p>¡Gracias por tu pago! Confirmamos tu inscripción y ya tienes acceso completo al curso.</p><p>Inicia sesión cuando quieras para comenzar a aprender a tu ritmo.</p>`,
          ctaText: 'Iniciar Sesión',
          ctaUrl: `${SITE_URL}/login`,
        }),
      });
      logger.info(`Correo de acceso enviado a ${userRecord.email} tras confirmar transferencia.`);
    } catch (error) {
      logger.error('Error enviando correo de acceso tras confirmar transferencia:', error);
    }
  }
);

export const onCourseProgressWritten = onDocumentWritten(
  { document: 'users/{userId}/progress/{courseId}', secrets: [resendApiKey] },
  async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) return;

    const data = after.data();
    if (!data || data.certificateSent) return;

    const completedLessons: string[] = data.completedLessons || [];
    if (completedLessons.length === 0) return;

    const { userId, courseId } = event.params;

    try {
      const lessonsSnapshot = await db.collection(`courses/${courseId}/lessons`).get();
      const totalPublishedLessons = lessonsSnapshot.docs.filter((d) => d.data().published !== false).length;

      if (totalPublishedLessons === 0 || completedLessons.length < totalPublishedLessons) return;

      const [userRecord, courseSnap] = await Promise.all([
        admin.auth().getUser(userId),
        db.collection('courses').doc(courseId).get(),
      ]);

      const courseData = courseSnap.data();
      const templateUrl: string | undefined = courseData?.certificateTemplateUrl;
      if (!templateUrl) {
        logger.warn(`El curso ${courseId} no tiene plantilla de constancia configurada (certificateTemplateUrl); no se generó constancia.`);
        return;
      }

      const studentEmail = userRecord.email;
      const studentName = userRecord.displayName || studentEmail || 'Alumno/a';
      const courseTitle = courseData?.title || 'el curso';

      const certificateBuffer = await generateCertificatePdf({ studentName, templateUrl });

      // Se guarda en Storage para poder descargarse desde el sitio, sin depender
      // de que el correo (Resend) esté configurado.
      const bucket = admin.storage().bucket();
      const certPath = `certificates/${userId}/${courseId}.pdf`;
      const certToken = randomUUID();
      await bucket.file(certPath).save(certificateBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: { firebaseStorageDownloadTokens: certToken },
        },
      });
      const certificateUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(certPath)}?alt=media&token=${certToken}`;

      await after.ref.set({ certificateSent: true, certificateUrl }, { merge: true });
      logger.info(`Constancia generada y disponible para descarga: ${certificateUrl}`);

      if (studentEmail) {
        await sendEmail({
          to: studentEmail,
          subject: `¡Felicidades! Completaste "${courseTitle}" 🎓`,
          html: renderBrandedEmail({
            heading: `¡Felicidades, ${studentName}! 🎉`,
            bodyHtml: `<p>Completaste exitosamente <strong>${courseTitle}</strong>. Tu constancia de finalización está adjunta en este correo, lista para descargar e imprimir.</p><p>También puedes descargarla cuando quieras desde tu cuenta, en la sección "Mis Cursos".</p>`,
            ctaText: 'Ver Mis Cursos',
            ctaUrl: `${SITE_URL}/mis-cursos`,
          }),
          attachments: [{ filename: 'constancia.pdf', content: certificateBuffer }],
        });
      }
    } catch (error) {
      logger.error(`Error generando la constancia para ${userId}/${courseId}:`, error);
    }
  }
);
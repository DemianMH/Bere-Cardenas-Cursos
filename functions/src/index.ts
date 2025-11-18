import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { defineString } from "firebase-functions/params";

admin.initializeApp();

const db = admin.firestore();

const mercadopagoAccessToken = defineString("MERCADOPAGO_ACCESS_TOKEN");

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

export const paymentWebhook = onRequest(async (request, response) => {
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
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference } from "mercadopago";
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

export const addAdminRole = onCall({ cors: true }, async (request) => {
  const { email } = request.data;
  if (!email) {
    throw new HttpsError('invalid-argument', 'Se necesita un email.');
  }
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { rol: 'docente' });
    await db.collection('users').doc(user.uid).set({ rol: 'docente' }, { merge: true });
    logger.info(`Rol 'docente' asignado a ${email}`);
    return { message: `Éxito! El rol 'docente' fue asignado a ${email}` };
  } catch (error) {
    logger.error("Error al asignar rol de admin:", error);
    throw new HttpsError('internal', 'Error al asignar el rol.');
  }
});

export const manageCoupons = onCall({ cors: true }, async (request) => {
  if (request.auth?.token.rol !== 'docente') {
    throw new HttpsError('permission-denied', 'Solo los docentes pueden gestionar cupones.');
  }

  const { action, data } = request.data;
  const couponsCollection = db.collection('coupons');

  try {
    switch (action) {
      case 'listCoupons': {
        const snapshot = await couponsCollection.orderBy('createdAt', 'desc').get();
        const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[];
        return { success: true, coupons };
      }
      case 'createCoupon': {
        const { code, discountPercentage } = data as Coupon;
        if (!code || typeof code !== 'string' || code.trim().length < 3) {
          throw new HttpsError('invalid-argument', 'El código debe tener al menos 3 caracteres.');
        }
        if (typeof discountPercentage !== 'number' || discountPercentage <= 0 || discountPercentage > 100) {
          throw new HttpsError('invalid-argument', 'El porcentaje de descuento debe ser un número entre 1 y 100.');
        }
        const existingCoupon = await couponsCollection.where('code', '==', code.trim().toUpperCase()).limit(1).get();
        if (!existingCoupon.empty) {
          throw new HttpsError('already-exists', 'Ya existe un cupón con este código.');
        }
        const newCoupon: Coupon = {
          code: code.trim().toUpperCase(),
          discountPercentage,
          active: true,
          createdAt: admin.firestore.Timestamp.now(),
        };
        const docRef = await couponsCollection.add(newCoupon);
        return { success: true, coupon: { id: docRef.id, ...newCoupon } };
      }
      case 'deleteCoupon': {
        const { id } = data;
        if (!id) throw new HttpsError('invalid-argument', 'Se requiere ID del cupón.');
        await couponsCollection.doc(id).delete();
        return { success: true, message: 'Cupón eliminado correctamente.' };
      }
      case 'toggleCouponStatus': {
         const { id, active } = data;
         if (!id || typeof active !== 'boolean') throw new HttpsError('invalid-argument', 'Se requiere ID y estado activo.');
         await couponsCollection.doc(id).update({ active: active });
         return { success: true, message: `Cupón ${active ? 'activado' : 'desactivado'}.` };
       }
      default:
        throw new HttpsError('invalid-argument', 'Acción no válida.');
    }
  } catch (error: any) {
    logger.error('Error en manageCoupons:', error);
    // Devuelve el código de error específico si existe, si no, 'internal'
    const errorCode = error?.code && typeof error.code === 'string'
                      ? error.code
                      : 'internal';
    throw new HttpsError(errorCode as any, error.message || 'Ocurrió un error en el servidor.');
  }
});


export const createPaymentPreference = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const client = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken.value() });
  const { courseId, title, price, couponCode } = request.data;
  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;

  if (!userEmail) {
    throw new HttpsError("invalid-argument", "El usuario no tiene un email asociado.");
  }
   if (!courseId || !title || typeof price !== 'number' || price <= 0) {
      throw new HttpsError("invalid-argument", "Datos del curso inválidos.");
  }

  let finalPrice = Number(price);
  let discountPercentage = 0;
  let appliedCouponCode: string | null = null;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const couponQuery = await db.collection('coupons')
      .where('code', '==', couponCode.trim().toUpperCase())
      .where('active', '==', true)
      .limit(1)
      .get();

    if (!couponQuery.empty) {
      const couponData = couponQuery.docs[0].data() as Coupon;
      discountPercentage = couponData.discountPercentage;
      finalPrice = finalPrice * (1 - discountPercentage / 100);
      appliedCouponCode = couponData.code;
      logger.info(`Cupón ${appliedCouponCode} aplicado. Descuento: ${discountPercentage}%. Precio final: ${finalPrice}`);
    } else {
       logger.warn(`Cupón ${couponCode} inválido o inactivo.`);
       // Lanzar error específico para que el frontend lo capture
       throw new HttpsError("not-found", `El cupón "${couponCode}" no es válido o ha expirado.`);
    }
  }

  finalPrice = Math.max(finalPrice, 1); // Asegurar precio mínimo si es necesario

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{
          id: courseId,
          title: `${title}${appliedCouponCode ? ` (Cupón: ${appliedCouponCode})` : ''}`,
          unit_price: Math.round(finalPrice * 100) / 100, // Redondear a 2 decimales
          quantity: 1
        }],
        payer: { email: userEmail },
        back_urls: {
          success: "https://berecardenascosmetologia.com/mis-cursos", // Cambiado a tu dominio final
          failure: `https://berecardenascosmetologia.com/cursos/${courseId}`, // Cambiado a tu dominio final
          pending: "https://berecardenascosmetologia.com/mis-cursos", // Cambiado a tu dominio final
        },
        auto_return: "approved",
        external_reference: `${userId}_${courseId}`,
        // Asegúrate que tu webhook URL sea la correcta después del deploy
        notification_url: `https://us-central1-proyecto-bere.cloudfunctions.net/paymentWebhook`,
        metadata: {
           coupon_code: appliedCouponCode // Guardar el cupón usado
         }
      },
    });
    logger.info(`Preferencia creada con ID: ${result.id}, Precio: ${finalPrice}`);
    return { id: result.id };
  } catch (error) {
    logger.error("Error al crear la preferencia de pago:", error);
    throw new HttpsError("internal", "No se pudo crear la preferencia de pago.");
  }
});

// Nota: La lógica interna del webhook para confirmar el pago y la inscripción
// aún necesita ser implementada si quieres automatizar la inscripción post-pago.
export const paymentWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Método no permitido");
    return;
  }
  logger.info("Webhook recibido:", request.body);

  const paymentInfo = request.body;

  if (paymentInfo?.type === 'payment' && paymentInfo?.data?.id) {
    const paymentId = paymentInfo.data.id;
    logger.info(`Procesando notificación para pago ID: ${paymentId}`);
    // Aquí iría la lógica futura para verificar el pago con Mercado Pago
    // y luego actualizar Firestore para inscribir al usuario.
  }

  response.status(200).send("OK"); // Responder siempre OK a Mercado Pago
});


export const manageUser = onCall({ cors: true }, async (request) => {
  if (request.auth?.token.rol !== 'docente') {
    throw new HttpsError('permission-denied', 'Solo los docentes pueden realizar esta acción.');
  }

  const { action, data } = request.data;

  try {
    switch (action) {
      case 'listUsers': {
        const userRecords = await admin.auth().listUsers();
        // Filtrar para no incluir al propio admin/docente si se desea
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
        if (email) updateData.email = email; // Cuidado al actualizar email, requiere verificación
        if (nombre) updateData.displayName = nombre;
        if (password) updateData.password = password;

        if (Object.keys(updateData).length > 0) {
           await admin.auth().updateUser(uid, updateData);
        }

        // Actualizar Firestore siempre si hay nombre o email (incluso si no cambiaron en Auth)
        // para asegurar consistencia o si solo se actualizó nombre.
        const firestoreUpdate: {nombre?: string, email?: string} = {};
        if (nombre) firestoreUpdate.nombre = nombre;
        // if (email) firestoreUpdate.email = email; // Podrías querer actualizar email en Firestore también

        if (Object.keys(firestoreUpdate).length > 0) {
           await db.collection('users').doc(uid).update(firestoreUpdate);
        }

        return { success: true, message: 'Usuario actualizado correctamente.' };
      }
      case 'createUser': {
         // Esta funcionalidad podría ser compleja (manejo de errores, roles, etc.)
         // Considera si realmente necesitas crear usuarios desde aquí.
        const { email, password, nombre } = data;
        const userRecord = await admin.auth().createUser({ email, password, displayName: nombre });
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          nombre: nombre,
          email: email,
          rol: 'estudiante', // Por defecto estudiante
          cursosInscritos: []
        });
        return { success: true, user: { uid: userRecord.uid, email, nombre } };
      }
      case 'deleteUser': {
        const { uid } = data;
        await admin.auth().deleteUser(uid);
        // También eliminar el documento del usuario en Firestore
        await db.collection('users').doc(uid).delete();
        // Considerar eliminar subcolecciones (progreso) si existen.
        // Esto usualmente requiere una función específica o extensión de Firebase.
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
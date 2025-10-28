import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { defineString } from "firebase-functions/params";
import cors from "cors"; // <--- IMPORTACIÓN CORREGIDA (default import)

try {
  admin.initializeApp();
} catch (e) {
  // logger.warn("Firebase Admin SDK ya inicializado."); // Puedes descomentar si quieres ver este log
}
const db = admin.firestore();

const mercadopagoAccessToken = defineString("MERCADOPAGO_ACCESS_TOKEN");

// Configura cors explícitamente
const corsOptions: cors.CorsOptions = {
    origin: ["https://berecardenascosmetologia.com", /http:\/\/localhost:\d+/], // Añadir http para localhost
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};
// Crear middleware C O R R E C T A M E N T E
const corsMiddleware = cors(corsOptions);

interface Coupon {
  id?: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  createdAt?: admin.firestore.Timestamp;
}

// Helper para envolver funciones onRequest con CORS y manejo de errores
const handleRequest = (
    handler: (req: any, resp: any, decodedToken?: admin.auth.DecodedIdToken | null) => Promise<void>,
    requiresAuth: boolean = false, // Indica si la ruta requiere autenticación
    requiresRole?: string // Indica si requiere un rol específico (ej. 'docente')
) => onRequest({ cors: false }, (req, resp) => { // Deshabilitar CORS automático de Firebase
    corsMiddleware(req, resp, async () => { // Aplicar nuestro middleware CORS
        if (req.method === 'OPTIONS') {
            resp.status(204).send(''); // Manejar preflight
            return;
        }

        let decodedToken: admin.auth.DecodedIdToken | null = null;
        if (requiresAuth || requiresRole) {
            const idToken = req.headers.authorization?.split('Bearer ')[1];
            if (!idToken) {
               resp.status(401).send({ error: { message: 'Unauthorized - No token provided' }});
               return;
            }
            try {
               decodedToken = await admin.auth().verifyIdToken(idToken);
               if (requiresRole && decodedToken.rol !== requiresRole) {
                   resp.status(403).send({ error: { message: `Permission Denied - Required role: ${requiresRole}` } });
                   return;
               }
            } catch (error) {
               logger.error("Token verification failed:", error);
               resp.status(401).send({ error: { message: 'Unauthorized - Invalid token' }});
               return;
            }
        }

        try {
            // Pasar el token decodificado (o null) al handler
            await handler(req, resp, decodedToken);
        } catch (error: any) {
            logger.error("Error no manejado en la función:", error);
            // Simplificar manejo de error genérico
            resp.status(500).send({ error: { message: error.message || "Error interno del servidor." } });
        }
    });
});

// --- addAdminRole como onRequest ---
export const addAdminRole = handleRequest(async (request, response, decodedToken) => {
    // Ya está verificado que es docente por el wrapper si requiresRole = 'docente'
    // const isAdmin = decodedToken?.rol === 'docente'; // O algún rol de superadmin
    // if (!isAdmin) { ... } // Añadir si es necesario

    const { email } = request.body.data || request.body;
     if (!email || typeof email !== 'string') {
        response.status(400).send({ error: { message: 'Se necesita un email válido.' } });
        return;
     }
     try {
        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(userRecord.uid, { rol: 'docente' });
        await db.collection('users').doc(userRecord.uid).set({ rol: 'docente' }, { merge: true });
        logger.info(`Rol 'docente' asignado a ${email}`);
        response.status(200).send({ data: { message: `Éxito! El rol 'docente' fue asignado a ${email}` } });
     } catch (error: any) {
        logger.error("Error al asignar rol de admin:", error);
         if (error.code === 'auth/user-not-found') {
            response.status(404).send({ error: { message: `No se encontró un usuario con el email ${email}.` } });
         } else {
            response.status(500).send({ error: { message: error.message || 'Error interno al asignar el rol.' } });
         }
     }
}, true, 'docente'); // Requiere autenticación y rol 'docente'

// --- manageCoupons como onRequest ---
export const manageCoupons = handleRequest(async (request, response, decodedToken) => {
    // Rol 'docente' ya verificado por el wrapper

    const { action, data } = request.body.data || request.body;
    const couponsCollection = db.collection('coupons');

    switch (action) {
        case 'listCoupons': {
            const snapshot = await couponsCollection.orderBy('createdAt', 'desc').get();
            const coupons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[];
            response.status(200).send({ data: { success: true, coupons } });
            return;
        }
        case 'createCoupon': {
            const { code, discountPercentage } = data as Coupon;
            if (!code || typeof code !== 'string' || code.trim().length < 3) {
                response.status(400).send({ error: { message: 'El código debe tener al menos 3 caracteres.' } });
                return;
            }
            const cleanCode = code.trim().toUpperCase();
            if (typeof discountPercentage !== 'number' || discountPercentage <= 0 || discountPercentage > 100) {
                response.status(400).send({ error: { message: 'El porcentaje de descuento debe ser un número entre 1 y 100.' } });
                return;
            }
            const existingCoupon = await couponsCollection.where('code', '==', cleanCode).limit(1).get();
            if (!existingCoupon.empty) {
                response.status(409).send({ error: { message: `Ya existe un cupón con el código "${cleanCode}".` } });
                return;
            }
            const newCouponData: Coupon = { code: cleanCode, discountPercentage, active: true, createdAt: admin.firestore.Timestamp.now() };
            const docRef = await couponsCollection.add(newCouponData);
            response.status(200).send({ data: { success: true, coupon: { id: docRef.id, ...newCouponData } } });
            return;
        }
        case 'deleteCoupon': {
            const { id } = data;
            if (!id || typeof id !== 'string') {
                response.status(400).send({ error: { message: 'Se requiere un ID de cupón válido.' } });
                return;
            }
            await couponsCollection.doc(id).delete();
            response.status(200).send({ data: { success: true, message: 'Cupón eliminado correctamente.' } });
            return;
        }
        case 'toggleCouponStatus': {
            const { id, active } = data;
            if (!id || typeof id !== 'string' || typeof active !== 'boolean') {
                response.status(400).send({ error: { message: 'Se requiere un ID válido y un estado activo (true/false).' } });
                return;
            }
            await couponsCollection.doc(id).update({ active: active });
            response.status(200).send({ data: { success: true, message: `Cupón ${active ? 'activado' : 'desactivado'}.` } });
            return;
        }
        default:
            response.status(400).send({ error: { message: 'Acción no válida.' } });
            return;
    }
}, true, 'docente'); // Requiere autenticación y rol 'docente'


// --- createPaymentPreference como onRequest ---
export const createPaymentPreference = handleRequest(async (request, response, decodedToken) => {
    // Autenticación ya verificada por el wrapper
    const userId = decodedToken!.uid; // Sabemos que no es null por requiresAuth=true
    const userEmail = decodedToken!.email;

     if (!userEmail) {
        response.status(400).send({ error: { message: "El usuario no tiene un email asociado." } });
        return;
     }

     const { courseId, title, price, couponCode } = request.body.data || request.body;

     if (!courseId || !title || typeof price !== 'number' || price <= 0) {
          response.status(400).send({ error: { message: "Datos del curso inválidos." } });
          return;
     }

     let finalPrice = Number(price);
     let discountPercentage = 0;
     let appliedCouponCode: string | null = null;
     let couponErrorMessage: string | null = null;

     if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
        const cleanCouponCode = couponCode.trim().toUpperCase();
        const couponQuery = await db.collection('coupons')
        .where('code', '==', cleanCouponCode)
        .where('active', '==', true)
        .limit(1)
        .get();

        if (!couponQuery.empty) {
            const couponData = couponQuery.docs[0].data() as Coupon;
            discountPercentage = couponData.discountPercentage;
            finalPrice = finalPrice * (1 - discountPercentage / 100);
            appliedCouponCode = couponData.code;
            logger.info(`Cupón ${appliedCouponCode} aplicado para usuario ${userId}. Precio final: ${finalPrice}`);
        } else {
            logger.warn(`Cupón "${cleanCouponCode}" inválido o inactivo intentado por usuario ${userId}.`);
            couponErrorMessage = `El cupón "${cleanCouponCode}" no es válido o ha expirado.`;
        }
     }

    if (couponErrorMessage) {
        response.status(400).send({ error: { message: couponErrorMessage, code: 'coupon-not-found' } });
        return;
    }

     finalPrice = Math.max(finalPrice, 1);

     try {
        const client = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken.value() });
        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ id: courseId, title: `${title}${appliedCouponCode ? ` (Cupón: ${appliedCouponCode})` : ''}`, unit_price: Math.round(finalPrice * 100) / 100, quantity: 1 }],
                payer: { email: userEmail },
                back_urls: { success: "https://berecardenascosmetologia.com/mis-cursos", failure: `https://berecardenascosmetologia.com/cursos/${courseId}`, pending: "https://berecardenascosmetologia.com/mis-cursos" },
                auto_return: "approved",
                external_reference: `${userId}_${courseId}`,
                notification_url: `https://us-central1-proyecto-bere.cloudfunctions.net/paymentWebhook`,
                metadata: { coupon_code: appliedCouponCode, user_id: userId, course_id: courseId }
            },
        });
        logger.info(`Preferencia creada con ID: ${result.id}, Precio: ${finalPrice}`);
        response.status(200).send({ data: { id: result.id } });
     } catch(error: any) {
         logger.error("Error al crear la preferencia de pago en Mercado Pago:", error);
         response.status(500).send({ error: { message: "No se pudo crear la preferencia de pago." , details: error.message } });
     }
}, true); // Requiere autenticación, pero no rol específico

// --- paymentWebhook se mantiene onRequest y SIN CORS explícito ---
export const paymentWebhook = onRequest(async (request, response) => {
    // ... (código del webhook sin cambios respecto a la versión anterior de onRequest) ...
    if (request.method !== "POST") {
        logger.warn("Webhook recibido con método no permitido:", request.method);
        response.status(405).send("Method Not Allowed");
        return;
    }
    logger.info("Webhook de Mercado Pago recibido:", JSON.stringify(request.body));
    const paymentInfo = request.body;
    if (paymentInfo?.type === 'payment' && paymentInfo?.data?.id) {
        const paymentId = paymentInfo.data.id as string;
        logger.info(`Procesando notificación para pago ID de MP: ${paymentId}`);
        try {
            const mpClient = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken.value() });
            const payment = new Payment(mpClient);
            const paymentDetails = await payment.get({ id: paymentId });
            logger.info(`Detalles del pago ${paymentId}: Estado=${paymentDetails.status}, Ref=${paymentDetails.external_reference}`);

            if (paymentDetails.status === 'approved' && paymentDetails.external_reference) {
                const [userId, courseId] = paymentDetails.external_reference.split('_');
                if (userId && courseId) {
                    const userDocRef = db.collection('users').doc(userId);
                    // Importante: Asegurarse que el documento exista antes de actualizar o usar set con merge
                     const userDoc = await userDocRef.get();
                     if (userDoc.exists) {
                         await userDocRef.update({
                             cursosInscritos: admin.firestore.FieldValue.arrayUnion(courseId)
                         });
                         logger.info(`Usuario ${userId} inscrito exitosamente al curso ${courseId} via webhook.`);
                     } else {
                          logger.error(`Webhook: Usuario ${userId} no encontrado en Firestore para inscribir al curso ${courseId}.`);
                          // Considera crear el usuario si no existe, aunque no debería pasar si pagó.
                     }

                    await db.collection('payments').doc(paymentId).set({
                        paymentId: paymentId, userId: userId, courseId: courseId, status: paymentDetails.status,
                        amount: paymentDetails.transaction_amount, couponUsed: paymentDetails.metadata?.coupon_code || null,
                        processedAt: admin.firestore.Timestamp.now()
                    }, { merge: true });
                } else {
                    logger.warn(`Referencia externa inválida en pago aprobado ${paymentId}: ${paymentDetails.external_reference}`);
                }
            } else {
                logger.info(`Pago ${paymentId} no está aprobado (estado: ${paymentDetails.status}) o no tiene referencia externa.`);
                if (paymentDetails.external_reference) {
                    const [userId, courseId] = paymentDetails.external_reference.split('_');
                     await db.collection('payments').doc(paymentId).set({
                         paymentId: paymentId, userId: userId || 'unknown', courseId: courseId || 'unknown', status: paymentDetails.status,
                         amount: paymentDetails.transaction_amount, couponUsed: paymentDetails.metadata?.coupon_code || null,
                         processedAt: admin.firestore.Timestamp.now()
                     }, { merge: true });
                 }
            }
        } catch (error: any) {
            logger.error(`Error procesando webhook para pago ${paymentId}:`, error);
        }
    } else {
        logger.warn("Webhook recibido no es de tipo 'payment' o falta data.id:", paymentInfo?.type);
    }
    response.status(200).send("OK");
});

// --- manageUser como onRequest ---
export const manageUser = handleRequest(async (request, response, decodedToken) => {
    // Rol 'docente' ya verificado por el wrapper

     const { action, data } = request.body.data || request.body;

     switch (action) {
         case 'listUsers': {
             const userRecords = await admin.auth().listUsers();
             const users = userRecords.users.map((user) => ({ uid: user.uid, email: user.email, nombre: user.displayName || '', }));
             response.status(200).send({ data: { success: true, users } });
             return;
         }
         case 'updateUser': {
             const { uid, email, nombre, password } = data; // email no se usa para actualizar Auth
             if (!uid || typeof uid !== 'string') {
                 response.status(400).send({ error: { message: 'Se requiere UID de usuario.' } });
                 return;
             }
             const updateDataAuth: { displayName?: string; password?: string } = {};
             if (nombre && typeof nombre === 'string') updateDataAuth.displayName = nombre;
             if (password && typeof password === 'string' && password.length >= 6) updateDataAuth.password = password;

             if (Object.keys(updateDataAuth).length > 0) { await admin.auth().updateUser(uid, updateDataAuth); logger.info(`Usuario Auth ${uid} actualizado.`); }

             const firestoreUpdate: {nombre?: string} = {};
             if (nombre && typeof nombre === 'string') firestoreUpdate.nombre = nombre;
             if (Object.keys(firestoreUpdate).length > 0) { await db.collection('users').doc(uid).update(firestoreUpdate); logger.info(`Usuario Firestore ${uid} actualizado.`); }

             response.status(200).send({ data: { success: true, message: 'Usuario actualizado correctamente.' } });
             return;
         }
         case 'createUser': {
             const { email, password, nombre } = data;
             if (!email || !password || password.length < 6 || !nombre) {
                 response.status(400).send({ error: { message: 'Datos de usuario inválidos.' }});
                 return;
             }
             const userRecord = await admin.auth().createUser({ email, password, displayName: nombre });
             await db.collection('users').doc(userRecord.uid).set({ uid: userRecord.uid, nombre: nombre, email: email, rol: 'estudiante', cursosInscritos: [] });
             logger.info(`Usuario ${email} creado por docente.`);
             response.status(200).send({ data: { success: true, user: { uid: userRecord.uid, email, nombre } } });
             return;
         }
         case 'deleteUser': {
             const { uid } = data;
             if (!uid || typeof uid !== 'string') {
                 response.status(400).send({ error: { message: 'Se requiere UID de usuario.' } });
                 return;
             }
             await admin.auth().deleteUser(uid);
             await db.collection('users').doc(uid).delete();
             logger.info(`Usuario ${uid} eliminado por docente.`);
             response.status(200).send({ data: { success: true, message: 'Usuario eliminado correctamente.' } });
             return;
         }
         default:
             response.status(400).send({ error: { message: 'Acción no válida.' } });
             return;
     }
}, true, 'docente'); // Requiere autenticación y rol 'docente'
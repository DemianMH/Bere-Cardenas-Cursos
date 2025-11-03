import { onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { defineString } from "firebase-functions/params";
import cors from "cors";

try {
  admin.initializeApp();
} catch (e) {

}
const db = admin.firestore();

const mercadopagoAccessToken = defineString("MERCADOPAGO_ACCESS_TOKEN");

const corsOptions: cors.CorsOptions = {
    origin: ["https://berecardenascosmetologia.com.mx", /http:\/\/localhost:\d+/],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
};
const corsMiddleware = cors(corsOptions);

interface Coupon {
  id?: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  createdAt?: admin.firestore.Timestamp;
}

const handleRequest = (
    handler: (req: Request, resp: Response, decodedToken?: admin.auth.DecodedIdToken | null) => Promise<void>,
    requiresAuth: boolean = false,
    requiresRole?: string
) => onRequest({ cors: false }, (req: Request, resp: Response) => {


    if (req.headers.authorization) { logger.info("Authorization header detected."); }
    else { logger.warn("Authorization header MISSING."); }

    corsMiddleware(req, resp, async () => {


        let decodedToken: admin.auth.DecodedIdToken | null = null;
        if (requiresAuth || requiresRole) {
            const idToken = req.headers.authorization?.split('Bearer ')[1];
            if (!idToken) { logger.error("Auth required, no token."); resp.status(401).send({ error: { message: 'Unauthorized - No token provided' }}); return; }
            try {
               decodedToken = await admin.auth().verifyIdToken(idToken);
               logger.info(`Token verified for UID: ${decodedToken.uid}`);
               if (requiresRole && decodedToken.rol !== requiresRole) {
                   logger.warn(`Permission denied UID: ${decodedToken.uid}. Required: ${requiresRole}, Has: ${decodedToken.rol}`);
                   resp.status(403).send({ error: { message: `Permission Denied - Required role: ${requiresRole}` } }); return;
               }
            } catch (error) { logger.error("Token verification failed:", error); resp.status(401).send({ error: { message: 'Unauthorized - Invalid token' }}); return; }
        }

        try {

            await handler(req, resp, decodedToken);
        } catch (error: any) {
            logger.error("Unhandled error in function handler:", req.path, error);
            resp.status(500).send({ error: { message: error.message || "Internal server error." } });
        }
    });
});


export const addAdminRole = handleRequest(async (request, response, decodedToken) => {

    const { email } = request.body.data || {};
     if (!email || typeof email !== 'string') { response.status(400).send({ error: { message: 'Se necesita un email válido.' } }); return; }
     try {
        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(userRecord.uid, { rol: 'docente' });
        await db.collection('users').doc(userRecord.uid).set({ rol: 'docente' }, { merge: true });
        logger.info(`Rol 'docente' asignado a ${email}`);
        response.status(200).send({ data: { message: `Éxito! El rol 'docente' fue asignado a ${email}` } });
     } catch (error: any) {
        logger.error("Error al asignar rol de admin:", error);
         if (error.code === 'auth/user-not-found') { response.status(404).send({ error: { message: `No se encontró usuario con email ${email}.` } }); }
         else { response.status(500).send({ error: { message: error.message || 'Error interno al asignar rol.' } }); }
     }
}, true, 'docente');


export const manageCoupons = handleRequest(async (request, response, decodedToken) => {

    const { action, data } = request.body.data || {};
    const couponsCollection = db.collection('coupons');
    try {
        switch (action) {
            case 'listCoupons': {
                const snapshot = await couponsCollection.orderBy('createdAt', 'desc').get();
                const coupons = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                response.status(200).send({ data: { success: true, coupons } });
                return;
            }
            case 'createCoupon': {
                const { code, discountPercentage } = data as Coupon;
                if (!code || typeof code !== 'string' || code.trim().length < 3) {
                    response.status(400).send({ error: { message: 'Código inválido (mín 3 caracteres).' } });
                    return;
                }
                const cleanCode = code.trim().toUpperCase();
                if (typeof discountPercentage !== 'number' || discountPercentage <= 0 || discountPercentage > 100) {
                    response.status(400).send({ error: { message: 'Porcentaje debe ser entre 1 y 100.' } });
                    return;
                }
                const existingCoupon = await couponsCollection.where('code', '==', cleanCode).limit(1).get();
                if (!existingCoupon.empty) {
                    response.status(409).send({ error: { message: `Ya existe cupón: "${cleanCode}".` } });
                    return;
                }
                const newCouponData: Coupon = {
                    code: cleanCode,
                    discountPercentage,
                    active: true,
                    createdAt: admin.firestore.Timestamp.now(),
                };
                const docRef = await couponsCollection.add(newCouponData);
                response.status(200).send({ data: { success: true, coupon: { id: docRef.id, ...newCouponData } } });
                return;
            }
            case 'deleteCoupon': {
                const { id } = data;
                if (!id || typeof id !== 'string') {
                    response.status(400).send({ error: { message: 'ID de cupón inválido.' } });
                    return;
                }
                await couponsCollection.doc(id).delete();
                response.status(200).send({ data: { success: true, message: 'Cupón eliminado.' } });
                return;
            }
            case 'toggleCouponStatus': {
                const { id, active } = data;
                if (!id || typeof id !== 'string' || typeof active !== 'boolean') {
                    response.status(400).send({ error: { message: 'Datos inválidos para cambiar estado.' } });
                    return;
                }
                await couponsCollection.doc(id).update({ active });
                response.status(200).send({ data: { success: true, message: `Cupón ${active ? 'activado' : 'desactivado'}.` } });
                return;
            }
            default:
                response.status(400).send({ error: { message: 'Acción no válida.' } });
                return;
        }
    } catch (error: any) {
        logger.error(`Error en manageCoupons (${action}):`, error);
        response.status(500).send({ error: { message: error.message || 'Error interno del servidor.' } });
    }
}, true, 'docente');


export const createPaymentPreference = handleRequest(async (request, response, decodedToken) => {
    const userId = decodedToken!.uid;
    const userEmail = decodedToken!.email;
     if (!userEmail) { response.status(400).send({ error: { message: "Email del usuario no encontrado en el token." } }); return; }

     const { courseId, title, price, couponCode } = request.body.data || {};

     if (!courseId || !title || typeof price !== 'number' || price <= 0) { response.status(400).send({ error: { message: "Datos del curso inválidos proporcionados." } }); return; }

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
            response.status(400).send({ error: { message: `El cupón "${cleanCouponCode}" no es válido o ha expirado.`, code: 'coupon-not-found' } });
            return;
        }
     }

     finalPrice = Math.max(finalPrice, 1);

     try {
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
             payer: {
                 email: userEmail
             },
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
        response.status(200).send({ data: { id: result.id } });
     } catch(error: any) {
         logger.error("Error al crear preferencia de Mercado Pago:", error.message, error?.cause);
         response.status(500).send({ error: { message: "Error al crear la preferencia de pago.", details: error.message } });
     }
}, true);


export const paymentWebhook = onRequest(async (request, response) => {
    logger.info("Webhook MP recibido:", request.body);
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
                        await userDocRef.update({
                            cursosInscritos: admin.firestore.FieldValue.arrayUnion(courseId)
                        });
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

                 if(paymentInfo.external_reference && typeof paymentInfo.external_reference === 'string'){
                     const [userId, courseId] = paymentInfo.external_reference.split('_');
                     if(userId && courseId){
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


export const manageUser = handleRequest(async (request, response, decodedToken) => {

     const { action, data } = request.body.data || {};

     try {
         switch (action) {
             case 'listUsers': {
                 try {
                     logger.info("Intentando listar usuarios desde Firebase Auth...");
                     const listUsersResult = await admin.auth().listUsers(1000);
                     logger.info(`listUsers() encontró ${listUsersResult.users.length} usuarios.`);

                     const users = listUsersResult.users.map(user => ({
                         uid: user.uid,
                         email: user.email,
                         nombre: user.displayName || user.email,
                     }));
                     logger.info("Usuarios mapeados para enviar (primeros 5):", JSON.stringify(users.slice(0, 5)));

                     response.status(200).send({ data: { success: true, users } });
                     return;

                 } catch (listError: any) {
                    logger.error("ERROR dentro del case listUsers:", listError);
                    response.status(500).send({ error: { message: "Error interno al listar usuarios de Auth." } });
                    return;
                 }
             }
             case 'updateUser': {
                 const { uid, nombre, password } = data;
                 if (!uid) {
                    response.status(400).send({ error: { message: 'UID es requerido.' } });
                    return;
                 }
                 const updatePayload: admin.auth.UpdateRequest = {};
                 if (nombre) updatePayload.displayName = nombre;
                 if (password) updatePayload.password = password;

                 if (Object.keys(updatePayload).length > 0) {
                    await admin.auth().updateUser(uid, updatePayload);
                    if(nombre){
                        await db.collection('users').doc(uid).set({ nombre: nombre }, { merge: true });
                    }
                     logger.info(`Usuario ${uid} actualizado en Auth.`);
                     response.status(200).send({ data: { success: true, message: 'Usuario actualizado.' } });
                 } else {
                    response.status(400).send({ error: { message: 'No hay datos para actualizar.' } });
                 }
                 return;
             }
             case 'createUser': {
                 response.status(501).send({ error: { message: 'Creación no implementada aún.' } });
                 return;
             }
             case 'deleteUser': {
                 const { uid } = data;
                  if (!uid) {
                    response.status(400).send({ error: { message: 'UID es requerido.' } });
                    return;
                 }
                  await admin.auth().deleteUser(uid);
                  logger.info(`Usuario ${uid} eliminado de Auth.`);
                  response.status(200).send({ data: { success: true, message: 'Usuario eliminado.' } });
                 return;
             }
             default:
                  logger.warn(`Acción desconocida recibida en manageUser: ${action}`);
                 response.status(400).send({ error: { message: 'Acción no válida.' } });
                 return;
         }
     } catch (error: any) {
         logger.error(`Error no capturado en el switch de manageUser (${action}):`, error);
         response.status(500).send({ error: { message: error.message || 'Error interno del servidor.' } });
     }
}, true, 'docente');
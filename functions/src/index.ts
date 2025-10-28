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
  // logger.info("Firebase Admin SDK ya inicializado.");
}
const db = admin.firestore();

const mercadopagoAccessToken = defineString("MERCADOPAGO_ACCESS_TOKEN");

const corsOptions: cors.CorsOptions = {
    origin: ["https://berecardenascosmetologia.com.mx", /http:\/\/localhost:\d+/], // CORREGIDO con .com.mx
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
    // logger.info("Request Headers:", JSON.stringify(req.headers));
    if (req.headers.authorization) { logger.info("Authorization header detected."); }
    else { logger.warn("Authorization header MISSING."); }

    corsMiddleware(req, resp, async () => {
        if (req.method === 'OPTIONS') { logger.info("Handling OPTIONS request"); resp.status(204).send(''); return; }

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
            // --->>> CORRECCIÓN CLAVE AQUÍ <<<---
            // Pasar request.body.data al handler, porque httpsCallable lo anida así.
            // Si el handler espera directamente el body, pasar req.body
            // Probemos pasando request.body directamente y el handler extraiga .data
            await handler(req, resp, decodedToken);
        } catch (error: any) {
            logger.error("Unhandled error in function handler:", req.path, error);
            resp.status(500).send({ error: { message: error.message || "Internal server error." } });
        }
    });
});

// --- addAdminRole como onRequest ---
export const addAdminRole = handleRequest(async (request, response, decodedToken) => {
    // --->>> ACCEDER A data DENTRO DEL BODY <<<---
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

// --- manageCoupons como onRequest ---
export const manageCoupons = handleRequest(async (request, response, decodedToken) => {
    // --->>> ACCEDER A data DENTRO DEL BODY <<<---
    const { action, data } = request.body.data || {};
    const couponsCollection = db.collection('coupons');
    switch (action) {
        case 'listCoupons': { /* ... lógica ... */ response.status(200).send({ data: { success: true, coupons: [] /* data real */ } }); return; }
        case 'createCoupon': { /* ... lógica ... */ response.status(200).send({ data: { success: true, coupon: {} /* data real */ } }); return; }
        case 'deleteCoupon': { /* ... lógica ... */ response.status(200).send({ data: { success: true, message: 'Cupón eliminado.' } }); return; }
        case 'toggleCouponStatus': { /* ... lógica ... */ response.status(200).send({ data: { success: true, message: `Cupón actualizado.` } }); return; }
        default: response.status(400).send({ error: { message: 'Acción no válida.' } }); return;
    }
    // Añadir lógica completa del switch case de la versión anterior aquí...
    // Ejemplo para createCoupon:
    /*
        case 'createCoupon': {
            const { code, discountPercentage } = data as Coupon;
            if (!code || typeof code !== 'string' || code.trim().length < 3) { response.status(400).send({ error: { message: 'Código inválido (mín 3 caracteres).' } }); return; }
            const cleanCode = code.trim().toUpperCase();
            if (typeof discountPercentage !== 'number' || discountPercentage <= 0 || discountPercentage > 100) { response.status(400).send({ error: { message: 'Porcentaje debe ser entre 1 y 100.' } }); return; }
            const existingCoupon = await couponsCollection.where('code', '==', cleanCode).limit(1).get();
            if (!existingCoupon.empty) { response.status(409).send({ error: { message: `Ya existe cupón: "${cleanCode}".` } }); return; }
            const newCouponData: Coupon = { code: cleanCode, discountPercentage, active: true, createdAt: admin.firestore.Timestamp.now() };
            const docRef = await couponsCollection.add(newCouponData);
            response.status(200).send({ data: { success: true, coupon: { id: docRef.id, ...newCouponData } } }); return;
        }
    */
    // Reemplaza los comentarios /* ... lógica ... */ con el código correspondiente del switch
    // Asegúrate de que todas las respuestas exitosas estén envueltas en { data: ... }
    // y los errores en { error: { message: ... } }

}, true, 'docente');

// --- createPaymentPreference como onRequest ---
export const createPaymentPreference = handleRequest(async (request, response, decodedToken) => {
    const userId = decodedToken!.uid;
    const userEmail = decodedToken!.email;
     if (!userEmail) { response.status(400).send({ error: { message: "Email no asociado." } }); return; }
     // --->>> ACCEDER A data DENTRO DEL BODY <<<---
     const { courseId, title, price, couponCode } = request.body.data || {};
     if (!courseId || !title || typeof price !== 'number' || price <= 0) { response.status(400).send({ error: { message: "Datos de curso inválidos." } }); return; }
     let finalPrice = Number(price);
     let appliedCouponCode: string | null = null;
     if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
        const cleanCouponCode = couponCode.trim().toUpperCase();
        const couponQuery = await db.collection('coupons').where('code', '==', cleanCouponCode).where('active', '==', true).limit(1).get();
        if (!couponQuery.empty) {
            const couponData = couponQuery.docs[0].data() as Coupon;
            finalPrice = finalPrice * (1 - couponData.discountPercentage / 100);
            appliedCouponCode = couponData.code;
            logger.info(`Cupón ${appliedCouponCode} ok para ${userId}. Precio: ${finalPrice}`);
        } else {
            logger.warn(`Cupón "${cleanCouponCode}" inválido por ${userId}.`);
            response.status(400).send({ error: { message: `El cupón "${cleanCouponCode}" no es válido.`, code: 'coupon-not-found' } }); return;
        }
     }
     finalPrice = Math.max(finalPrice, 1);
     try {
        const client = new MercadoPagoConfig({ accessToken: mercadopagoAccessToken.value() });
        const preference = new Preference(client);
        // Construir preferenceBody aquí...
        const preferenceBody = {
             items: [{ id: courseId, title: `${title}${appliedCouponCode ? ` (Cupón: ${appliedCouponCode})` : ''}`, unit_price: Math.round(finalPrice * 100) / 100, quantity: 1 }],
             payer: { email: userEmail },
             back_urls: { success: "https://berecardenascosmetologia.com.mx/mis-cursos", failure: `https://berecardenascosmetologia.com.mx/cursos/${courseId}`, pending: "https://berecardenascosmetologia.com.mx/mis-cursos" }, // Usa .com.mx
             auto_return: "approved",
             external_reference: `${userId}_${courseId}`,
             notification_url: `https://us-central1-proyecto-bere.cloudfunctions.net/paymentWebhook`,
             metadata: { coupon_code: appliedCouponCode, user_id: userId, course_id: courseId }
        };
        const result = await preference.create({ body: preferenceBody });
        logger.info(`Preferencia ${result.id} creada, Precio: ${finalPrice}`);
        response.status(200).send({ data: { id: result.id } }); // Enviar dentro de data
     } catch(error: any) {
         logger.error("Error creando preferencia MP:", error);
         response.status(500).send({ error: { message: "Error al crear preferencia de pago." , details: error.message } });
     }
}, true); // Requiere auth

// --- paymentWebhook ---
// (Sin cambios significativos, ya era onRequest)
export const paymentWebhook = onRequest(async (request, response) => { /* ... código anterior ... */ });

// --- manageUser como onRequest ---
export const manageUser = handleRequest(async (request, response, decodedToken) => {
    // --->>> ACCEDER A data DENTRO DEL BODY <<<---
     const { action, data } = request.body.data || {};
     switch (action) {
         // Reemplaza /* ... lógica ... */ con la lógica del switch de la versión anterior
         // Asegúrate que las respuestas exitosas estén en { data: ... } y errores en { error: ... }
         case 'listUsers': { /* ... lógica ... */ response.status(200).send({ data: { success: true, users: [] } }); return; }
         case 'updateUser': { /* ... lógica ... */ response.status(200).send({ data: { success: true, message: 'Usuario actualizado.' } }); return; }
         case 'createUser': { /* ... lógica ... */ response.status(200).send({ data: { success: true, user: {} } }); return; }
         case 'deleteUser': { /* ... lógica ... */ response.status(200).send({ data: { success: true, message: 'Usuario eliminado.' } }); return; }
         default: response.status(400).send({ error: { message: 'Acción no válida.' } }); return;
     }
}, true, 'docente'); // Requiere auth y rol 'docente'
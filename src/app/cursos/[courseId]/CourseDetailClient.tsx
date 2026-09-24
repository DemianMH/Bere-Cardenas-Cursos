"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, getDocs, setDoc, arrayUnion, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckmarkIcon } from '@/app/components/CheckmarkIcon';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Image from 'next/image';

interface Lesson {
  id: string;
  title: string;
  videoUrl?: string;
  textContent?: string;
  supportMaterialUrl?: string;
  order?: number;
  published?: boolean;
  createdAt?: any;
}

interface CourseDetails {
  title: string;
  description: string;
  price?: number;
  imageUrl?: string;
  previewLesson?: {
    title: string;
    videoUrl?: string | null;
    textContent?: string | null;
  } | null;
}

const canPreview = (url: string | undefined): boolean => {
  if (!url) return false;
  const extension = url.split('.').pop()?.toLowerCase();
  return ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(extension || '');
};

export default function CourseDetailClient({
  courseId,
  course,
}: {
  courseId: string;
  course: CourseDetails;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const [showTransferDetails, setShowTransferDetails] = useState(false);
  const [transferName, setTransferName] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferRequestSent, setTransferRequestSent] = useState(false);

  useEffect(() => {
    const checkEnrollment = user?.cursosInscritos?.includes(courseId) || user?.rol === 'docente';
    setIsEnrolled(!!checkEnrollment);

    const fetchLessons = async () => {
      try {
        const lessonsSnapshot = await getDocs(collection(db, `courses/${courseId}/lessons`));
        let lessonsData = lessonsSnapshot.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title,
              videoUrl: data.videoUrl,
              textContent: data.textContent,
              supportMaterialUrl: data.supportMaterialUrl,
              order: typeof data.order === 'number' ? data.order : 9999,
              published: data.published,
              createdAt: data.createdAt,
            } as Lesson;
          })
          .filter(l => l.published !== false);

        lessonsData.sort((a, b) => {
          const orderA = a.order ?? 9999;
          const orderB = b.order ?? 9999;
          if (orderA !== orderB) return orderA - orderB;
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeA - timeB;
        });

        setLessons(lessonsData);
        if (lessonsData.length > 0) {
          setSelectedLesson(lessonsData[0]);
        }
      } catch (error) {
        console.error("Error al cargar el temario:", error);
      }
    };

    const fetchProgress = async () => {
      if (checkEnrollment && user) {
        try {
          const progressDocRef = doc(db, 'users', user.uid, 'progress', courseId);
          const progressSnap = await getDoc(progressDocRef);
          if (progressSnap.exists()) {
            setCompletedLessons(progressSnap.data().completedLessons || []);
          }
        } catch (error) {
          console.error("Error al cargar el progreso:", error);
        }
      }
    };

    fetchLessons();
    fetchProgress();
  }, [courseId, user]);

  const loadMercadoPagoCheckout = (preferenceId: string) => {
    return new Promise<void>((resolve, reject) => {
      const renderCheckout = () => {
        try {
          const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
          if (!publicKey) {
            reject(new Error('MERCADOPAGO_PUBLIC_KEY_MISSING'));
            return;
          }
          const mp = new (window as any).MercadoPago(publicKey, { locale: 'es-MX' });
          mp.checkout({
            preference: { id: preferenceId },
            render: { container: '.checkout-btn', label: 'Pagar ahora' }
          });

          const originalButton = document.querySelector('.enroll-button');
          if (originalButton) (originalButton as HTMLElement).style.display = 'none';
          const transferButton = document.querySelector('.transfer-button');
          if (transferButton) (transferButton as HTMLElement).style.display = 'none';
          const couponSection = document.querySelector('.coupon-section');
          if (couponSection) (couponSection as HTMLElement).style.display = 'none';

          resolve();
        } catch (err) {
          reject(err);
        }
      };

      const existingScript = document.getElementById('mercadopago-sdk') as HTMLScriptElement | null;
      if (existingScript && (window as any).MercadoPago) {
        renderCheckout();
        return;
      }

      const script = existingScript || document.createElement('script');
      script.id = 'mercadopago-sdk';
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = renderCheckout;
      script.onerror = () => reject(new Error('No se pudo cargar el widget de pago de Mercado Pago.'));
      if (!existingScript) document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!course?.price || course.price <= 0) {
      alert('El precio del curso no está definido. Contacta al administrador.');
      return;
    }

    setIsProcessingPayment(true);
    setCouponError(null);
    setPaymentError(null);

    try {
      const functions = getFunctions();
      const createPaymentPreference = httpsCallable(functions, 'createPaymentPreference');

      const result: any = await createPaymentPreference({
        courseId,
        title: course.title,
        price: course.price,
        couponCode: couponCode.trim() || undefined
      });

      const preferenceId = result.data.id;
      if (!preferenceId) {
        throw new Error('No se recibió ID de preferencia de Mercado Pago.');
      }

      await loadMercadoPagoCheckout(preferenceId);
    } catch (error: any) {
      console.error('Error al iniciar el pago con tarjeta:', error);
      if (error.code === 'functions/not-found' && error.message?.includes('cupón')) {
        setCouponError(error.message);
      } else if (error.code === 'functions/invalid-argument') {
        setCouponError(error.message);
      } else if (error.message === 'MERCADOPAGO_PUBLIC_KEY_MISSING') {
        setPaymentError('El pago con tarjeta no está disponible en este momento. Usa "Pagar por Transferencia" o contáctanos por WhatsApp.');
      } else {
        setPaymentError('Hubo un error al iniciar el proceso de pago. Inténtalo de nuevo o usa "Pagar por Transferencia".');
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!transferName.trim() || !transferPhone.trim()) {
      alert('Por favor, completa tu nombre y número de WhatsApp.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      await setDoc(doc(collection(db, 'transferRequests')), {
        userId: user.uid,
        userName: transferName,
        userPhone: transferPhone,
        courseId,
        courseTitle: course?.title,
        couponCode: couponCode.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setTransferRequestSent(true);
      setShowTransferDetails(false);
    } catch (error) {
      console.error('Error al crear la solicitud de transferencia:', error);
      alert('No se pudo enviar tu solicitud. Por favor, inténtalo de nuevo.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleVideoProgress = async (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (!user || !selectedLesson || completedLessons.includes(selectedLesson.id)) return;
    const video = event.currentTarget;
    const percentageWatched = (video.currentTime / video.duration) * 100;
    if (percentageWatched > 80) {
      try {
        const progressDocRef = doc(db, 'users', user.uid, 'progress', courseId);
        await setDoc(progressDocRef, { completedLessons: arrayUnion(selectedLesson.id) }, { merge: true });
        setCompletedLessons(prev => [...prev, selectedLesson.id]);
      } catch (error) {
        console.error('Error al guardar el progreso: ', error);
      }
    }
  };

  // Para visitantes sin sesión no podemos leer la subcolección de lecciones (reglas de
  // seguridad), así que la vista previa gratuita usa la copia pública guardada en el curso.
  const previewLesson = course.previewLesson;
  const displayLesson: Lesson | null = isEnrolled
    ? selectedLesson
    : previewLesson
      ? { id: '__preview__', title: previewLesson.title, videoUrl: previewLesson.videoUrl || undefined, textContent: previewLesson.textContent || undefined }
      : null;
  const canWatchSelected = isEnrolled ? !!selectedLesson : !!previewLesson;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <main className="w-full lg:w-2/3">
          <div className="bg-surface p-6 rounded-lg shadow-lg border border-primary/20">
            {course.imageUrl && (
              <div className="relative w-full aspect-video mb-6 rounded-lg overflow-hidden">
                <Image src={course.imageUrl} alt={course.title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover" priority />
              </div>
            )}
            <h1 className="text-4xl font-bold text-primary mb-4">{course.title}</h1>
            <p className="text-text-secondary mb-6">{course.description}</p>

            {canWatchSelected && displayLesson && (
              <div>
                {!isEnrolled && (
                  <span className="inline-block bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full mb-3">
                    Vista previa gratuita
                  </span>
                )}
                <div className="aspect-video mb-6 bg-background rounded-lg">
                  <h2 className="text-2xl font-bold text-text-primary mb-4 px-2 pt-2">{displayLesson.title}</h2>
                  {displayLesson.videoUrl ? (
                    <video key={displayLesson.id} controls className="w-full h-full rounded-b-lg" src={displayLesson.videoUrl} preload="metadata" onTimeUpdate={handleVideoProgress} />
                  ) : (
                    <div className="p-4 text-text-secondary">
                      <p>{displayLesson.textContent || "Contenido de texto no disponible."}</p>
                    </div>
                  )}
                </div>
                {isEnrolled && displayLesson.textContent && (
                  <div className="mt-4 p-4 bg-background rounded">
                    <h3 className="text-xl font-semibold text-primary mb-2">Material de Lectura</h3>
                    <p className="text-text-secondary whitespace-pre-wrap">{displayLesson.textContent}</p>
                  </div>
                )}
                {isEnrolled && displayLesson.supportMaterialUrl && (
                  <div className="mt-4">
                    {canPreview(displayLesson.supportMaterialUrl) ? (
                      <a href={displayLesson.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-primary/20 text-primary font-bold py-2 px-4 rounded-full hover:bg-primary hover:text-background transition-colors">
                        Ver Material de Apoyo
                      </a>
                    ) : (
                      <a href={displayLesson.supportMaterialUrl} download target="_blank" rel="noopener noreferrer" className="inline-block bg-primary/20 text-primary font-bold py-2 px-4 rounded-full hover:bg-primary hover:text-background transition-colors">
                        Descargar Material de Apoyo
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            {!isEnrolled && (
              <div className="bg-background border border-primary/50 p-8 rounded-lg text-center mt-6">
                <h2 className="text-2xl font-bold text-primary mb-2">Inscríbete para Acceder al Contenido Completo</h2>
                {course.price && course.price > 0 && (
                  <p className="text-3xl font-bold text-white my-4">
                    ${course.price} MXN
                  </p>
                )}

                {!showTransferDetails && !transferRequestSent && (
                  <>
                    <div className="coupon-section max-w-sm mx-auto my-4">
                      <input
                        type="text"
                        placeholder="Código de Cupón (opcional)"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                        className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                      />
                      {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                    </div>

                    {paymentError && <p className="text-red-400 text-sm mb-4 max-w-sm mx-auto">{paymentError}</p>}

                    <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
                      <div className="checkout-btn flex-grow"></div>
                      <button
                        onClick={handlePayment}
                        disabled={isProcessingPayment}
                        className="enroll-button bg-primary text-background font-bold py-3 px-8 rounded-full text-lg hover:opacity-90 transition-opacity disabled:bg-gray-500 disabled:cursor-not-allowed"
                      >
                        {isProcessingPayment ? 'Procesando...' : 'Pagar con Tarjeta'}
                      </button>
                      <button
                        onClick={() => setShowTransferDetails(true)}
                        disabled={isProcessingPayment}
                        className="transfer-button bg-transparent border border-primary text-primary font-bold py-3 px-8 rounded-full text-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        Pagar por Transferencia
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {showTransferDetails && !transferRequestSent && (
              <div className="mt-6 bg-background border border-primary/30 p-6 rounded-lg">
                <button onClick={() => setShowTransferDetails(false)} className="text-sm text-text-secondary hover:text-primary mb-4">&larr; Volver a opciones de pago</button>
                <h3 className="text-xl font-bold text-primary mb-4">Datos para Transferencia o Depósito</h3>

                <div className="coupon-section max-w-sm mx-auto mb-4">
                  <input
                    type="text"
                    placeholder="Código de Cupón (opcional)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <p className="text-center text-text-secondary text-lg mb-4">Total a transferir: <strong>${course?.price || 0} MXN</strong> (El descuento se aplicará al confirmar)</p>

                <div className="text-left text-text-secondary space-y-2 mb-6">
                  <p><strong>Banco:</strong> BBVA</p>
                  <p><strong>Nombre:</strong> María Berenice Cardenas Vázquez</p>
                  <p><strong>Tarjeta (para pago en OXXO):</strong> 4152313843701959</p>
                  <p><strong>Cuenta:</strong> 0478155313</p>
                  <p><strong>CLABE Interbancaria:</strong> 012320004781553139</p>
                </div>
                <p className="text-sm text-yellow-300/80 mb-6">
                  <strong>Importante:</strong> Una vez realizado tu pago, envía tu comprobante por WhatsApp al <strong>33 1694 2473</strong> para que activemos tu curso.
                </p>
                <form onSubmit={handleTransferRequest}>
                  <h4 className="font-bold text-text-primary mb-3">Aparta tu lugar llenando tus datos:</h4>
                  <input type="text" placeholder="Nombre Completo" value={transferName} onChange={(e) => setTransferName(e.target.value)} required className="bg-surface w-full p-2 rounded mb-3 text-text-primary border border-gray-600 focus:border-primary" />
                  <input type="tel" placeholder="Número de WhatsApp" value={transferPhone} onChange={(e) => setTransferPhone(e.target.value)} required className="bg-surface w-full p-2 rounded mb-4 text-text-primary border border-gray-600 focus:border-primary" />
                  <button type="submit" disabled={isProcessingPayment} className="w-full bg-primary text-background font-bold py-3 px-8 rounded-full hover:opacity-90 disabled:bg-gray-500">
                    {isProcessingPayment ? 'Enviando...' : 'Apartar mi Lugar y Enviar Comprobante'}
                  </button>
                </form>
              </div>
            )}

            {transferRequestSent && (
              <div className="mt-6 bg-green-900/50 border border-green-400 p-6 rounded-lg text-center">
                <h3 className="text-2xl font-bold text-green-300 mb-3">¡Solicitud Enviada!</h3>
                <p className="text-text-primary mb-2">
                  Hemos recibido tus datos para apartar tu lugar. Tu inscripción se confirmará una vez que recibamos tu comprobante de pago y lo validemos.
                </p>
                <p className="text-text-secondary">
                  No olvides enviar tu comprobante por WhatsApp al:
                  <strong className="text-primary ml-2">33 1694 2473</strong>
                </p>
              </div>
            )}
          </div>
        </main>
        <aside className="w-full lg:w-1/3 bg-surface p-4 rounded-lg shadow-lg border border-primary/20 h-fit">
          <h2 className="text-2xl font-bold text-primary mb-4">Temario del Curso</h2>
          {isEnrolled ? (
            <ul>
              {lessons.map((lesson, index) => {
                const isCompleted = completedLessons.includes(lesson.id);
                return (
                  <li key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`p-3 rounded-md mb-2 flex items-center justify-between transition-colors ${selectedLesson?.id === lesson.id ? 'bg-primary text-background' : 'hover:bg-background cursor-pointer'}`}
                  >
                    <span className="flex-grow mr-2"><span className="font-semibold">Lección {index + 1}:</span> {lesson.title}</span>
                    {isCompleted && <CheckmarkIcon className="w-5 h-5 text-green-400 flex-shrink-0" />}
                  </li>
                );
              })}
              {lessons.length === 0 && (
                <li className="p-3 text-text-secondary/70">Aún no hay lecciones en este curso.</li>
              )}
            </ul>
          ) : (
            <ul>
              {previewLesson && (
                <li className="p-3 rounded-md mb-2 bg-primary text-background">
                  <span className="font-semibold">Lección 1:</span> {previewLesson.title}
                  <span className="ml-2 text-xs font-bold">(Vista previa)</span>
                </li>
              )}
              <li className="p-3 text-text-secondary/70 flex items-center gap-2">
                🔒 El resto del temario se desbloquea al inscribirte.
              </li>
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

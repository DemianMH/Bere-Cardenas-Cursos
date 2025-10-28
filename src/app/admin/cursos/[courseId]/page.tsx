"use client";

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, doc, getDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, app } from '@/lib/firebase'; // Importar app
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckmarkIcon } from '@/app/components/CheckmarkIcon';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface Lesson {
  id: string;
  title: string;
  videoUrl?: string; // Hacer opcional por si es solo texto
  textContent?: string;
  supportMaterialUrl?: string;
}
interface CourseDetails {
  title: string;
  description: string;
  price?: number;
}

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const [showTransferDetails, setShowTransferDetails] = useState(false);
  const [transferName, setTransferName] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferRequestSent, setTransferRequestSent] = useState(false);


  useEffect(() => {
    const checkEnrollment = user?.cursosInscritos?.includes(params.courseId) || user?.rol === 'docente';
    setIsEnrolled(checkEnrollment);

    const fetchCourseContent = async () => {
      setLoading(true);
      try {
        const courseDocRef = doc(db, 'courses', params.courseId);
        const courseSnap = await getDoc(courseDocRef);
        if (courseSnap.exists()) {
          const courseData = courseSnap.data() as CourseDetails;
          setCourse(courseData);
        } else {
            console.error("Curso no encontrado");
            // Podrías redirigir o mostrar un mensaje
            setCourse(null); // Asegura que course sea null si no existe
        }

        const lessonsColRef = collection(db, `courses/${params.courseId}/lessons`);
        const q = query(lessonsColRef, orderBy('createdAt', 'asc'));
        const lessonsSnapshot = await getDocs(q);
        const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lesson[];
        setLessons(lessonsData);

        if (checkEnrollment && user && lessonsData.length > 0) {
          const progressDocRef = doc(db, 'users', user.uid, 'progress', params.courseId);
          const progressSnap = await getDoc(progressDocRef);
          const userProgress = progressSnap.exists() ? progressSnap.data().completedLessons || [] : [];
          setCompletedLessons(userProgress);

          const firstUncompletedLesson = lessonsData.find(lesson => !userProgress.includes(lesson.id));
          setSelectedLesson(firstUncompletedLesson || lessonsData[0]); // Seleccionar el primero si no hay no completados o todos completados
        } else if (lessonsData.length > 0 && !checkEnrollment) {
            setSelectedLesson(lessonsData[0]); // Mostrar la primera lección (sin video) si no está inscrito
        }

      } catch (error) {
        console.error("Error al cargar el contenido:", error);
      } finally {
        setLoading(false);
      }
    };
    if (params.courseId) fetchCourseContent();
  }, [params.courseId, user]); // Depender de `user` para re-evaluar inscripción y progreso


  const handlePayment = async () => {
    if (!user) {
      router.push('/login?redirect=/cursos/' + params.courseId); // Redirigir a login guardando la página actual
      return;
    }
    if (!course?.price || course.price <= 0) {
        alert("El precio del curso no está definido. Contacta al administrador.");
        return;
    }

    setIsProcessingPayment(true);
    setCouponError(null); // Limpiar error anterior

    try {
      const functions = getFunctions(app, 'us-central1'); // Especificar región si es necesario
      const createPaymentPreference = httpsCallable(functions, 'createPaymentPreference');

      const result: any = await createPaymentPreference({
        courseId: params.courseId,
        title: course.title,
        price: course.price,
        couponCode: couponCode.trim() || undefined // Enviar cupón si existe y no está vacío
      });

      const preferenceId = result.data.id;
      if (preferenceId) {
        const checkoutBtnContainer = document.querySelector('.checkout-btn');
        if(checkoutBtnContainer) checkoutBtnContainer.innerHTML = ''; // Limpiar por si acaso
        const transferButton = document.querySelector('.transfer-button');
        if(transferButton) (transferButton as HTMLElement).style.display = 'none'; // Ocultar botón de transferencia

        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => {
          // Asegúrate que la clave pública esté en tus variables de entorno y sea correcta
          const mpPublicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
          if (!mpPublicKey) {
              console.error("Clave pública de Mercado Pago no configurada.");
              alert("Error de configuración de pago. Contacta al administrador.");
              setIsProcessingPayment(false); // Permitir reintento si hay error de config
              return;
          }
          const mp = new (window as any).MercadoPago(mpPublicKey, { locale: 'es-MX' });
          mp.checkout({
            preference: { id: preferenceId },
            render: { container: '.checkout-btn', label: 'Pagar ahora' } // El contenedor donde se renderizará el botón
          });
          // El botón de MP reemplaza el contenido de '.checkout-btn'
           // Ocultar botón original de Pagar con Tarjeta explícitamente
           const originalButton = document.querySelector('.enroll-button');
           if (originalButton) (originalButton as HTMLElement).style.display = 'none';
           const couponSection = document.querySelector('.coupon-section');
           if (couponSection) (couponSection as HTMLElement).style.display = 'none';
        };
         script.onerror = () => {
             console.error("Error al cargar el SDK de Mercado Pago.");
             alert("No se pudo cargar la plataforma de pago. Intenta recargar la página.");
             setIsProcessingPayment(false);
         };
        document.body.appendChild(script);

      } else {
          throw new Error("No se recibió ID de preferencia de Mercado Pago.");
      }
    } catch (error: any) {
      console.error("Error al crear la preferencia de pago:", error);
      // Capturar error específico de cupón inválido desde la función onCall
      if (error.code === 'functions/not-found' && error.message.includes("cupón")) {
           setCouponError(error.message);
      } else if (error.code === 'functions/invalid-argument') {
          setCouponError(error.message); // Podría ser otro argumento inválido también
      }
       else {
           alert("Hubo un error al iniciar el proceso de pago. Inténtalo de nuevo o contacta soporte.");
      }
      setIsProcessingPayment(false); // Permitir reintentar
    }
    // No ponemos setIsProcessingPayment(false) aquí porque el SDK de MP toma el control
  };


  const handleTransferRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login?redirect=/cursos/' + params.courseId);
      return;
    }
    if (!transferName.trim() || !transferPhone.trim()) {
      alert("Por favor, completa tu nombre y número de WhatsApp.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Usar setDoc con doc(collection(...)) para generar un ID automático
      await setDoc(doc(collection(db, 'transferRequests')), {
        userId: user.uid,
        userName: transferName,
        userPhone: transferPhone,
        courseId: params.courseId,
        courseTitle: course?.title,
        couponCode: couponCode.trim() || null, // Guardar cupón si se usó
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setTransferRequestSent(true);
      setShowTransferDetails(false); // Ocultar formulario tras enviar
    } catch (error) {
      console.error("Error al crear la solicitud de transferencia:", error);
      alert("No se pudo enviar tu solicitud. Por favor, inténtalo de nuevo.");
    } finally {
      setIsProcessingPayment(false);
    }
  };


  const handleVideoProgress = async (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (!user || !selectedLesson || completedLessons.includes(selectedLesson.id)) return;
    const video = event.currentTarget;
    // Asegurarse que la duración es válida antes de calcular
    if (video.duration && !isNaN(video.duration) && video.duration > 0) {
      const percentageWatched = (video.currentTime / video.duration) * 100;
      if (percentageWatched > 80) {
        try {
          const progressDocRef = doc(db, 'users', user.uid, 'progress', params.courseId);
          await setDoc(progressDocRef, { completedLessons: arrayUnion(selectedLesson.id) }, { merge: true });
          // Actualizar estado local inmediatamente para reflejar el cambio
          setCompletedLessons(prev => [...prev, selectedLesson.id]);
          // Quitar el listener para no seguir actualizando una vez completado
          video.removeEventListener('timeupdate', handleVideoProgress as any);
          console.log(`Lección ${selectedLesson.title} marcada como completada.`);
        } catch (error) {
          console.error("Error al guardar el progreso: ", error);
        }
      }
    }
  };

  if (loading) return <p className="text-center mt-12 text-lg text-text-secondary">Cargando...</p>;
  if (!course) return <p className="text-center mt-12 text-lg text-text-secondary">Curso no encontrado o inválido.</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <main className="w-full lg:w-2/3">
          <div className="bg-surface p-6 rounded-lg shadow-lg border border-primary/20">
            <h1 className="text-4xl font-bold text-primary mb-4">{course.title}</h1>
            <p className="text-text-secondary mb-6">{course.description}</p>
            {isEnrolled && selectedLesson ? (
              <div>
                <div className="aspect-video mb-6 bg-background rounded-lg overflow-hidden">
                  <h2 className="text-2xl font-bold text-text-primary mb-4 px-4 pt-4">{selectedLesson.title}</h2>
                  {selectedLesson.videoUrl ? (
                    <video key={selectedLesson.id} controls controlsList="nodownload" className="w-full h-auto" src={selectedLesson.videoUrl} preload="metadata" onTimeUpdate={handleVideoProgress} />
                  ) : (
                     <div className="p-4 text-text-secondary">
                        {(selectedLesson.textContent) ?
                            <p className="whitespace-pre-wrap">{selectedLesson.textContent}</p>
                            : <p>Contenido de texto no disponible para esta lección.</p>
                        }
                    </div>
                  )}
                </div>
                 {selectedLesson.textContent && selectedLesson.videoUrl && (
                    <div className="mt-4 p-4 bg-background rounded">
                        <h3 className="text-xl font-semibold text-primary mb-2">Material de Lectura</h3>
                        <p className="text-text-secondary whitespace-pre-wrap">{selectedLesson.textContent}</p>
                    </div>
                )}
                {selectedLesson.supportMaterialUrl && (
                  <div className="mt-4">
                    <a href={selectedLesson.supportMaterialUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-primary/20 text-primary font-bold py-2 px-4 rounded-full hover:bg-primary hover:text-background transition-colors">
                      Descargar Material de Apoyo
                    </a>
                  </div>
                )}
              </div>
            ) : !transferRequestSent ? ( // Mostrar opciones de pago si no está inscrito Y no ha enviado solicitud de transferencia
              <div className="bg-background border border-primary/50 p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold text-primary mb-2">Inscríbete para Acceder al Contenido Completo</h2>
                {course.price && course.price > 0 && (
                  <p className="text-3xl font-bold text-white my-4">
                    ${course.price} MXN
                  </p>
                )}

                {!showTransferDetails ? (
                  <>
                  <div className="coupon-section max-w-sm mx-auto my-4">
                    <input
                      type="text"
                      placeholder="Código de Cupón (opcional)"
                      value={couponCode}
                      onChange={(e) => {setCouponCode(e.target.value.toUpperCase()); setCouponError(null);}}
                      className="w-full bg-surface border border-gray-600 rounded px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                       disabled={isProcessingPayment}
                    />
                   {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                   </div>

                  <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
                    {/* Contenedor para el botón de Mercado Pago */}
                    <div className="checkout-btn flex-grow md:flex-grow-0"></div>
                    {/* Botón inicial que llama a handlePayment */}
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
                ) : ( // Mostrar detalles de transferencia
                    <div className="mt-6 bg-background border border-primary/30 p-6 rounded-lg text-left">
                        <button onClick={() => setShowTransferDetails(false)} className="text-sm text-text-secondary hover:text-primary mb-4">&larr; Volver a opciones de pago</button>
                        <h3 className="text-xl font-bold text-primary mb-4 text-center">Datos para Transferencia o Depósito</h3>

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
              </div>
            ) : ( // Mostrar mensaje de solicitud enviada si no está inscrito y ya envió solicitud
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
        <aside className="w-full lg:w-1/3 bg-surface p-4 rounded-lg shadow-lg border border-primary/20 h-fit lg:sticky lg:top-24">
          <h2 className="text-2xl font-bold text-primary mb-4">Temario del Curso</h2>
          <ul className="max-h-[70vh] overflow-y-auto">
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessons.includes(lesson.id);
              // Desbloqueado si es la primera, o la anterior está completa, o es docente
              const isUnlocked = isEnrolled && (index === 0 || completedLessons.includes(lessons[index - 1]?.id) || user?.rol === 'docente');
              return (
                <li key={lesson.id}
                  onClick={() => isUnlocked && setSelectedLesson(lesson)}
                  className={`p-3 rounded-md mb-2 flex items-center justify-between ${
                    !isEnrolled
                      ? 'bg-background/30 text-text-secondary/40 cursor-not-allowed' // Estilo si no está inscrito
                      : isUnlocked
                        ? (selectedLesson?.id === lesson.id
                            ? 'bg-primary text-background' // Estilo seleccionado
                            : 'hover:bg-background cursor-pointer text-text-secondary') // Estilo desbloqueado no seleccionado
                        : 'bg-background/50 text-text-secondary/50 cursor-not-allowed' // Estilo bloqueado
                  }`}
                >
                  <span className="flex-grow mr-2 overflow-hidden overflow-ellipsis whitespace-nowrap">
                      <span className="font-semibold">Lección {index + 1}:</span> {lesson.title}
                  </span>
                  {isCompleted && isEnrolled && <CheckmarkIcon className="w-5 h-5 text-green-400 flex-shrink-0" />}
                  {!isUnlocked && isEnrolled && <span className="text-xs text-gray-500 flex-shrink-0">🔒</span>}
                </li>
              );
            })}
             {lessons.length === 0 && !loading && (
                 <li className="p-3 text-text-secondary/70">Aún no hay lecciones en este curso.</li>
             )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
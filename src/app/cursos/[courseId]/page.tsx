// RUTA: src/app/cursos/[courseId]/page.tsx

"use client";

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, doc, getDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckmarkIcon } from '@/app/components/CheckmarkIcon';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
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

  // Estados para el flujo de transferencia
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
        if (courseSnap.exists()) setCourse(courseSnap.data() as CourseDetails);

        const lessonsColRef = collection(db, `courses/${params.courseId}/lessons`);
        const q = query(lessonsColRef, orderBy('createdAt', 'asc'));
        const lessonsSnapshot = await getDocs(q);
        const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lesson[];
        setLessons(lessonsData);

        if (checkEnrollment && user) {
          const progressDocRef = doc(db, 'users', user.uid, 'progress', params.courseId);
          const progressSnap = await getDoc(progressDocRef);
          const userProgress = progressSnap.exists() ? progressSnap.data().completedLessons || [] : [];
          setCompletedLessons(userProgress);
          
          const firstUncompletedLesson = lessonsData.find(lesson => !userProgress.includes(lesson.id));
          setSelectedLesson(firstUncompletedLesson || lessonsData[0]);
        }
      } catch (error) {
        console.error("Error al cargar el contenido:", error);
      } finally {
        setLoading(false);
      }
    };
    if (params.courseId) fetchCourseContent();
  }, [params.courseId, user]);

  const handlePayment = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!course?.price || course.price <= 0) {
        alert("El precio del curso no está definido. Contacta al administrador.");
        return;
    }
    
    setIsProcessingPayment(true);

    try {
      const functions = getFunctions();
      const createPaymentPreference = httpsCallable(functions, 'createPaymentPreference');
      
      const result: any = await createPaymentPreference({ 
        courseId: params.courseId,
        title: course.title,
        price: course.price
      });

      const preferenceId = result.data.id;
      if (preferenceId) {
        const checkoutBtnContainer = document.querySelector('.checkout-btn');
        if(checkoutBtnContainer) checkoutBtnContainer.innerHTML = '';
        
        const script = document.createElement("script");
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => {
          const mp = new (window as any).MercadoPago('APP_USR-064fcb79-4b66-4476-8fc3-a93db866326e', { locale: 'es-MX' });
          mp.checkout({
            preference: { id: preferenceId },
            render: { container: '.checkout-btn', label: 'Pagar ahora' }
          });
        };
        document.body.appendChild(script);
        
        const originalButton = document.querySelector('.enroll-button');
        if (originalButton) (originalButton as HTMLElement).style.display = 'none';
      }
    } catch (error) {
      console.error("Error al crear la preferencia de pago:", error);
      alert("Hubo un error al iniciar el proceso de pago. Inténtalo de nuevo.");
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
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setTransferRequestSent(true);
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
    const percentageWatched = (video.currentTime / video.duration) * 100;
    if (percentageWatched > 80) {
      try {
        const progressDocRef = doc(db, 'users', user.uid, 'progress', params.courseId);
        await setDoc(progressDocRef, { completedLessons: arrayUnion(selectedLesson.id) }, { merge: true });
        setCompletedLessons(prev => [...prev, selectedLesson.id]);
        video.removeEventListener('timeupdate', handleVideoProgress as any);
      } catch (error) {
        console.error("Error al guardar el progreso: ", error);
      }
    }
  };
  
  if (loading) return <p className="text-center mt-12 text-lg text-text-secondary">Cargando...</p>;
  if (!course) return <p className="text-center mt-12 text-lg text-text-secondary">Curso no encontrado.</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <main className="w-full lg:w-2/3">
          <div className="bg-surface p-6 rounded-lg shadow-lg border border-primary/20">
            <h1 className="text-4xl font-bold text-primary mb-4">{course.title}</h1>
            <p className="text-text-secondary mb-6">{course.description}</p>
            {isEnrolled && selectedLesson ? (
              <div>
                <div className="aspect-video mb-6 bg-background rounded-lg">
                  <h2 className="text-2xl font-bold text-text-primary mb-4 px-2 pt-2">{selectedLesson.title}</h2>
                  <video key={selectedLesson.id} controls className="w-full h-full rounded-b-lg" src={selectedLesson.videoUrl} preload="metadata" onTimeUpdate={handleVideoProgress} />
                </div>
              </div>
            ) : (
              <div className="bg-background border border-primary/50 p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold text-primary mb-2">Inscríbete para Acceder al Contenido Completo</h2>
                {course.price && course.price > 0 && (
                  <p className="text-3xl font-bold text-white my-4">
                    ${course.price} MXN
                  </p>
                )}
                {!showTransferDetails && !transferRequestSent && (
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
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
                      className="bg-transparent border border-primary text-primary font-bold py-3 px-8 rounded-full text-lg hover:bg-primary/10 transition-colors"
                    >
                      Pagar por Transferencia
                    </button>
                  </div>
                )}
              </div>
            )}
             {showTransferDetails && !transferRequestSent && (
              <div className="mt-6 bg-background border border-primary/30 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-primary mb-4">Datos para Transferencia o Depósito</h3>
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
                    {isProcessingPayment ? 'Enviando...' : 'Apartar mi Lugar'}
                  </button>
                </form>
              </div>
            )}

            {transferRequestSent && (
              <div className="mt-6 bg-green-900/50 border border-green-400 p-6 rounded-lg text-center">
                <h3 className="text-2xl font-bold text-green-300 mb-3">¡Solicitud Enviada!</h3>
                <p className="text-text-primary mb-2">
                  Hemos recibido tus datos para apartar tu lugar. Uno de nuestros docentes confirmará tu inscripción una vez que recibamos tu comprobante de pago.
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
          <ul>
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessons.includes(lesson.id);
              const isUnlocked = index === 0 || completedLessons.includes(lessons[index - 1]?.id) || user?.rol === 'docente';
              return (
                <li key={lesson.id}
                  onClick={() => isUnlocked && isEnrolled && setSelectedLesson(lesson)}
                  className={`p-3 rounded-md mb-2 flex items-center justify-between
                    ${!isEnrolled || !isUnlocked ? 'bg-background/50 text-text-secondary/50 cursor-not-allowed' : 'transition-colors'}
                    ${isEnrolled && isUnlocked ? (selectedLesson?.id === lesson.id ? 'bg-primary text-background' : 'hover:bg-background cursor-pointer') : ''}
                  `}
                >
                  <span className="flex-grow"><span className="font-semibold">Lección {index + 1}:</span> {lesson.title}</span>
                  {isCompleted && <CheckmarkIcon className="w-5 h-5 text-green-400 ml-2 flex-shrink-0" />}
                  {!isUnlocked && isEnrolled && <span className="text-xs ml-2 flex-shrink-0">🔒</span>}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
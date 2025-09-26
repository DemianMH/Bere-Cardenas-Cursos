"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, getDocs, orderBy, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckmarkIcon } from '@/app/components/CheckmarkIcon';

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
}

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const isUserEnrolled = (user?.rol === 'docente') || (user?.cursosInscritos?.includes(params.courseId) || false);
    setIsEnrolled(isUserEnrolled);
    
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

        if (isUserEnrolled && user) {
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

  const handleEnrollment = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        cursosInscritos: arrayUnion(params.courseId)
      });
      await refreshUserData();
      alert('¡Inscripción exitosa!');
    } catch (error) {
      console.error("Error en la inscripción:", error);
      alert("Hubo un error al procesar tu inscripción.");
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
                {selectedLesson.textContent && (
                  <div className="prose max-w-none mb-6 text-text-secondary">
                    <h3 className="text-2xl font-bold text-primary mb-2">Material de Lectura</h3>
                    <p>{selectedLesson.textContent}</p>
                  </div>
                )}
                {selectedLesson.supportMaterialUrl && (
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-primary mb-2">Material de Apoyo</h3>
                    <a href={selectedLesson.supportMaterialUrl} target="_blank" rel="noopener noreferrer"
                      className="bg-primary text-background font-bold py-2 px-4 rounded-full hover:opacity-90 inline-block">Descargar Manual</a>
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-primary mb-2">¿Tienes alguna duda?</h3>
                  <textarea className="w-full mt-2 p-2 border border-gray-700 bg-background rounded-md text-text-primary focus:border-primary focus:outline-none" rows={4} placeholder="Escribe tu pregunta aquí..."></textarea>
                  <button className="mt-2 bg-primary text-background font-bold py-2 px-4 rounded-full hover:opacity-90">Enviar Pregunta</button>
                </div>
              </div>
            ) : (
              <div className="bg-background border border-primary/50 p-8 rounded-lg text-center">
                <h2 className="text-2xl font-bold text-primary mb-4">Inscríbete para Acceder al Contenido Completo</h2>
                <button onClick={handleEnrollment} className="bg-primary text-background font-bold py-3 px-8 rounded-full text-lg hover:opacity-90 transition-opacity">
                  Inscribirme Ahora
                </button>
              </div>
            )}
          </div>
        </main>
        <aside className="w-full lg:w-1/3 bg-surface p-4 rounded-lg shadow-lg border border-primary/20 h-fit">
          <h2 className="text-2xl font-bold text-primary mb-4">Temario del Curso</h2>
          <ul>
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessons.includes(lesson.id);
              const isUnlocked = index === 0 || completedLessons.includes(lessons[index - 1]?.id);
              return (
                <li key={lesson.id}
                  onClick={() => isUnlocked && isEnrolled && setSelectedLesson(lesson)}
                  className={`p-3 rounded-md mb-2 flex items-center justify-between
                    ${!isEnrolled || !isUnlocked ? 'bg-background/50 text-text-secondary/50 cursor-not-allowed' : 'transition-colors'}
                    ${isEnrolled && isUnlocked ? (selectedLesson?.id === lesson.id ? 'bg-primary text-background' : 'hover:bg-background cursor-pointer') : ''}
                  `}
                >
                  <span className="flex-grow"><span className="font-semibold">Lección {index + 1}:</span> {lesson.title}</span>
                  {isCompleted && <CheckmarkIcon className="w-5 h-5 text-primary ml-2 flex-shrink-0" />}
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
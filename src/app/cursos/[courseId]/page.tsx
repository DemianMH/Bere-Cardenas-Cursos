// src/app/cursos/[courseId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, getDocs, orderBy, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { CheckmarkIcon } from '@/app/components/CheckmarkIcon'; // Importamos el icono

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
  const { user } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]); // Estado para el progreso
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const isUserEnrolled = user?.cursosInscritos?.includes(params.courseId) || false;
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

        // Si el usuario está inscrito, cargar su progreso
        if (isUserEnrolled && user) {
          const progressDocRef = doc(db, 'users', user.uid, 'progress', params.courseId);
          const progressSnap = await getDoc(progressDocRef);
          if (progressSnap.exists()) {
            setCompletedLessons(progressSnap.data().completedLessons || []);
          }
          // Seleccionar la primera lección no completada, o la primera de todas
          const firstUncompletedLesson = lessonsData.find(lesson => !(progressSnap.data()?.completedLessons || []).includes(lesson.id));
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
    // ... (sin cambios en esta función)
  };

  const handleVideoProgress = async (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (!user || !selectedLesson || completedLessons.includes(selectedLesson.id)) return;
    const video = event.currentTarget;
    const percentageWatched = (video.currentTime / video.duration) * 100;

    if (percentageWatched > 80) {
      try {
        const progressDocRef = doc(db, 'users', user.uid, 'progress', params.courseId);
        await setDoc(progressDocRef, { completedLessons: arrayUnion(selectedLesson.id) }, { merge: true });
        setCompletedLessons(prev => [...prev, selectedLesson.id]); // Actualizamos el estado local
        video.removeEventListener('timeupdate', handleVideoProgress as any);
        console.log(`Progreso guardado para: ${selectedLesson.title}`);
      } catch (error) {
        console.error("Error al guardar el progreso: ", error);
      }
    }
  };

  if (loading) return <p className="text-center mt-12 text-lg">Cargando...</p>;
  if (!course) return <p className="text-center mt-12 text-lg">Curso no encontrado.</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <main className="w-full lg:w-2/3">{/* ... (el contenido principal no cambia) */}</main>

        <aside className="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow-md h-fit">
          <h2 className="text-2xl font-bold text-primary-dark mb-4">Temario del Curso</h2>
          <ul>
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessons.includes(lesson.id);
              // Una lección está desbloqueada si es la primera, o si la anterior ha sido completada.
              const isUnlocked = index === 0 || completedLessons.includes(lessons[index - 1]?.id);

              return (
                <li
                  key={lesson.id}
                  onClick={() => isUnlocked && isEnrolled && setSelectedLesson(lesson)}
                  className={`p-3 rounded-md mb-2 flex items-center justify-between
                    ${!isEnrolled || !isUnlocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'transition-colors'}
                    ${isEnrolled && isUnlocked ? (selectedLesson?.id === lesson.id ? 'bg-primary-medium text-white' : 'hover:bg-primary-light cursor-pointer') : ''}
                  `}
                >
                  <span><span className="font-semibold">Lección {index + 1}:</span> {lesson.title}</span>
                  {isCompleted && <CheckmarkIcon className="w-5 h-5 text-green-500" />}
                  {!isUnlocked && isEnrolled && <span className="text-xs">🔒</span>}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
// src/app/cursos/[courseId]/page.tsx
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
  const { user } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
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
        // --- LA CORRECCIÓN ESTÁ EN LA SIGUIENTE LÍNEA ---
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
    // (sin cambios en esta función)
  };

  const handleVideoProgress = async (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    // (sin cambios en esta función)
  };

  if (loading) return <p className="text-center mt-12 text-lg">Cargando...</p>;
  if (!course) return <p className="text-center mt-12 text-lg">Curso no encontrado.</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ... El resto del código JSX no cambia ... */}
      <div className="flex flex-col lg:flex-row gap-8">
        <main className="w-full lg:w-2/3">
          {/* ... */}
        </main>

        <aside className="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow-md h-fit">
          <h2 className="text-2xl font-bold text-primary-dark mb-4">Temario del Curso</h2>
          <ul>
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessons.includes(lesson.id);
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
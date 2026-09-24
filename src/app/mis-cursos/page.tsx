"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, documentId, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  title: string;
  description: string;
  certificateUrl?: string | null;
}

export default function MisCursosPage() {
  const { user, loading: authLoading } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    const fetchEnrolledCourses = async () => {
      if (user?.cursosInscritos?.length) {
        try {
          const q = query(collection(db, 'courses'), where(documentId(), 'in', user.cursosInscritos));
          const querySnapshot = await getDocs(q);
          const coursesData = await Promise.all(
            querySnapshot.docs.map(async (courseDoc) => {
              let certificateUrl: string | null = null;
              try {
                const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', courseDoc.id));
                certificateUrl = progressSnap.exists() ? progressSnap.data().certificateUrl || null : null;
              } catch (error) {
                console.error('Error al revisar la constancia:', error);
              }
              return { id: courseDoc.id, ...courseDoc.data(), certificateUrl } as Course;
            })
          );
          setEnrolledCourses(coursesData);
        } catch (error) {
          console.error("Error al cargar cursos:", error);
        }
      }
      setLoading(false);
    };
    if (user) fetchEnrolledCourses();
  }, [user, authLoading, router]);

  if (authLoading || loading) return <p className="text-center mt-12 text-lg text-text-secondary">Cargando tus cursos...</p>;

  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl text-center font-bold text-primary mb-12">Mis Cursos</h1>
      <div className="max-w-4xl mx-auto">
        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {enrolledCourses.map(course => (
              <div key={course.id} className="bg-surface p-6 rounded-lg shadow-lg border border-transparent hover:border-primary transition-all h-full flex flex-col">
                <Link href={`/cursos/${course.id}`} className="flex-grow">
                  <h2 className="text-2xl font-bold text-primary mb-2">{course.title}</h2>
                  <p className="text-text-secondary mb-4">{course.description}</p>
                  <span className="text-primary font-bold">Continuar aprendiendo →</span>
                </Link>
                {course.certificateUrl && (
                  <a
                    href={course.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-center bg-primary/20 text-primary font-bold py-2 px-4 rounded-full hover:bg-primary hover:text-background transition-colors"
                  >
                    🎓 Descargar Constancia
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bg-surface p-8 rounded-lg shadow-lg border border-primary/20">
            <p className="text-lg text-text-secondary mb-4">Aún no te has inscrito a ningún curso.</p>
            <Link href="/cursos">
              <span className="bg-primary text-background font-bold py-3 px-6 rounded-full hover:opacity-90">Explorar Cursos</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  title: string;
  description: string;
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
      if (user && user.cursosInscritos && user.cursosInscritos.length > 0) {
        try {
          const coursesRef = collection(db, 'courses');
          const q = query(coursesRef, where(documentId(), 'in', user.cursosInscritos));
          const querySnapshot = await getDocs(q);
          
          const coursesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Course[];
          
          setEnrolledCourses(coursesData);
        } catch (error) {
          console.error("Error al cargar los cursos inscritos: ", error);
        }
      }
      setLoading(false);
    };

    if (user) {
      fetchEnrolledCourses();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <p className="text-center mt-12 text-lg">Cargando tus cursos...</p>;
  }
  
  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl text-center font-bold text-primary-dark mb-12">
        Mis Cursos
      </h1>
      <div className="max-w-4xl mx-auto">
        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {enrolledCourses.map(course => (
              <Link key={course.id} href={`/cursos/${course.id}`}>
                <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow h-full cursor-pointer">
                  <h2 className="text-2xl font-bold text-primary-dark mb-2">{course.title}</h2>
                  <p className="text-gray-600 mb-4">{course.description}</p>
                  <span className="text-primary-medium font-bold">Continuar aprendiendo →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <p className="text-lg text-gray-700 mb-4">Aún no te has inscrito a ningún curso.</p>
            <Link href="/cursos">
              <span className="bg-primary-medium text-white font-bold py-3 px-6 rounded-full hover:bg-primary-dark">
                Explorar Cursos
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
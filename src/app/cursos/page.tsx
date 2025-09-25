"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
}

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const coursesCollection = collection(db, 'courses');
      const q = query(coursesCollection, orderBy('order'));
      const querySnapshot = await getDocs(q);
      const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
      setCourses(coursesData);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  if (loading) return <p className="text-center mt-12 text-lg">Cargando cursos...</p>;

  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl text-center font-bold text-primary-dark mb-12">Nuestros Cursos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          <div key={course.id} className="bg-white p-6 rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary-dark mb-2">{course.title}</h2>
              <p className="text-gray-600 mb-4">{course.description}</p>
            </div>
            {/* ESTE ENLACE LLEVA AL VISUALIZADOR DEL ESTUDIANTE */}
            <Link href={`/cursos/${course.id}`}>
              <span className="bg-primary-medium text-white py-2 px-4 rounded-full text-center hover:bg-primary-dark transition-colors w-full inline-block mt-4">
                Ver Contenido del Curso
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
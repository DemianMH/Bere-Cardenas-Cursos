"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
}

export default function AdminCursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const coursesCollection = collection(db, 'courses');
      const q = query(coursesCollection, orderBy('order'));
      const querySnapshot = await getDocs(q);
      const coursesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];
      setCourses(coursesData);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  if (loading) return <p className="text-center mt-8">Cargando cursos...</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl text-center font-bold text-primary-dark mb-10">
        Panel de Administración
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          // ESTE ENLACE LLEVA AL EDITOR DEL DOCENTE
          <Link key={course.id} href={`/admin/cursos/${course.id}`}>
            <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <h2 className="text-2xl font-bold text-primary-dark">{course.title}</h2>
              <p className="text-primary-medium mt-2">Gestionar lecciones</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
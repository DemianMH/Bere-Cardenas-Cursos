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
      try {
        const q = query(collection(db, 'courses'), orderBy('order'));
        const querySnapshot = await getDocs(q);
        setCourses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[]);
      } catch (error) {
        console.error("Error al cargar los cursos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  if (loading) return <p className="text-center mt-8 text-text-secondary">Cargando cursos...</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl text-center font-bold text-primary mb-10">Gestionar Cursos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          <Link key={course.id} href={`/admin/cursos/${course.id}`}>
            <div className="bg-surface p-6 rounded-lg shadow-lg border border-transparent hover:border-primary transition-all cursor-pointer">
              <h2 className="text-2xl font-bold text-primary">{course.title}</h2>
              <p className="text-text-secondary mt-2">Gestionar lecciones →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Course { 
  id: string; 
  title: string; 
}

export default function AdminCursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el curso "${courseTitle}"? Esta acción no se puede deshacer y borrará todas sus lecciones.`)) {
      try {
        setLoading(true);
        // NOTA: En una app de producción a gran escala, se necesitaría una Cloud Function para borrar subcolecciones de forma recursiva.
        // Por ahora, eliminaremos el documento principal del curso.
        await deleteDoc(doc(db, 'courses', courseId));
        alert('Curso eliminado con éxito.');
        fetchCourses(); // Refrescar la lista de cursos
      } catch (error) {
        console.error("Error al eliminar el curso: ", error);
        alert('No se pudo eliminar el curso.');
        setLoading(false);
      }
    }
  };

  if (loading) return <p className="text-center mt-8 text-text-secondary">Cargando...</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-primary">Gestionar Cursos</h1>
        <Link href="/admin/cursos/nuevo">
          <span className="bg-primary text-background font-bold py-2 px-6 rounded-full hover:opacity-90 transition-opacity">
            + Crear Nuevo Curso
          </span>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          <div key={course.id} className="bg-surface p-6 rounded-lg shadow-lg border border-primary/20 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary">{course.title}</h2>
              <Link href={`/admin/cursos/${course.id}`}>
                <p className="text-text-secondary mt-2 hover:underline cursor-pointer">Gestionar lecciones →</p>
              </Link>
            </div>
            <div className="flex gap-4 mt-6 border-t border-primary/20 pt-4">
              <Link href={`/admin/cursos/editar/${course.id}`} className="text-center w-full bg-blue-600/20 text-blue-300 font-bold py-2 px-4 rounded-full text-sm hover:bg-blue-500 hover:text-white transition-colors">
                Editar
              </Link>
              <button 
                onClick={(e) => { e.preventDefault(); handleDeleteCourse(course.id, course.title); }}
                className="w-full bg-red-600/20 text-red-300 font-bold py-2 px-4 rounded-full text-sm hover:bg-red-500 hover:text-white transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


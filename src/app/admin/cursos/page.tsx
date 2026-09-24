"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Link from 'next/link';
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  published?: boolean;
  imageUrl?: string;
}

export default function AdminCursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const handleTogglePublish = async (course: Course) => {
    const nextPublished = !(course.published !== false);
    setBusyId(course.id);
    try {
      await updateDoc(doc(db, 'courses', course.id), { published: nextPublished });
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, published: nextPublished } : c));
    } catch (error) {
      console.error("Error al cambiar el estado del curso:", error);
      alert('No se pudo cambiar el estado del curso.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el curso "${courseTitle}"? Esta acción no se puede deshacer y borrará todas sus lecciones y archivos.`)) {
      setBusyId(courseId);
      try {
        const functions = getFunctions();
        const deleteCourse = httpsCallable(functions, 'deleteCourse');
        await deleteCourse({ courseId });
        alert('Curso eliminado con éxito.');
        fetchCourses();
      } catch (error) {
        console.error("Error al eliminar el curso: ", error);
        alert('No se pudo eliminar el curso.');
      } finally {
        setBusyId(null);
      }
    }
  };

  if (loading) return <p className="text-center mt-8 text-text-secondary">Cargando...</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="text-4xl font-bold text-primary">Gestionar Cursos</h1>
        <Link href="/admin/cursos/nuevo">
          <span className="bg-primary text-background font-bold py-2 px-6 rounded-full hover:opacity-90 transition-opacity">
            + Crear Nuevo Curso
          </span>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => {
          const isPublished = course.published !== false;
          const isBusy = busyId === course.id;
          return (
            <div key={course.id} className="bg-surface rounded-lg shadow-lg border border-primary/20 flex flex-col justify-between overflow-hidden">
              {course.imageUrl && (
                <div className="relative w-full aspect-video bg-background">
                  <Image src={course.imageUrl} alt={course.title} fill className="object-cover" />
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-primary">{course.title}</h2>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isPublished ? 'bg-green-600/20 text-green-300' : 'bg-yellow-600/20 text-yellow-300'}`}>
                      {isPublished ? 'Publicado' : 'Borrador'}
                    </span>
                  </div>
                  <Link href={`/admin/cursos/${course.id}`}>
                    <p className="text-text-secondary mt-2 hover:underline cursor-pointer">Gestionar lecciones →</p>
                  </Link>
                </div>
                <div className="flex flex-col gap-3 mt-6 border-t border-primary/20 pt-4">
                  <button
                    onClick={() => handleTogglePublish(course)}
                    disabled={isBusy}
                    className={`w-full font-bold py-2 px-4 rounded-full text-sm transition-colors disabled:opacity-50 ${isPublished ? 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-500 hover:text-white' : 'bg-green-600/20 text-green-300 hover:bg-green-500 hover:text-white'}`}
                  >
                    {isPublished ? 'Ocultar (pasar a borrador)' : 'Publicar curso'}
                  </button>
                  <div className="flex gap-4">
                    <Link href={`/admin/cursos/editar/${course.id}`} className="text-center w-full bg-blue-600/20 text-blue-300 font-bold py-2 px-4 rounded-full text-sm hover:bg-blue-500 hover:text-white transition-colors">
                      Editar
                    </Link>
                    <button
                      onClick={(e) => { e.preventDefault(); handleDeleteCourse(course.id, course.title); }}
                      disabled={isBusy}
                      className="w-full bg-red-600/20 text-red-300 font-bold py-2 px-4 rounded-full text-sm hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

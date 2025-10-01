// RUTA: src/app/admin/alumnos/[userId]/page.tsx

"use client";
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface UserProfile {
  uid: string;
  nombre: string;
  email: string;
  cursosInscritos: string[];
}
interface Course {
  id: string;
  title: string;
}

export default function EditarAlumnoPage({ params }: { params: { userId: string } }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Cargar datos del usuario desde Firestore
        const userDocRef = doc(db, 'users', params.userId);
        const userSnap = await getDoc(userDocRef);

        // --- LÍNEA CORREGIDA ---
        if (userSnap.exists()) {
          const userData = userSnap.data();
          // Construimos el objeto explícitamente para que coincida con la interfaz UserProfile
          setUser({
            uid: userSnap.id,
            nombre: userData.nombre || '',
            email: userData.email || '',
            cursosInscritos: userData.cursosInscritos || [],
          });
        }
        // --- FIN DE LA CORRECCIÓN ---

        // Cargar todos los cursos disponibles
        const coursesQuery = query(collection(db, 'courses'), orderBy('order'));
        const coursesSnapshot = await getDocs(coursesQuery);
        setAllCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));

      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.userId]);

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setIsSaving(true);
      try {
        const functions = getFunctions();
        const manageUser = httpsCallable(functions, 'manageUser');
        await manageUser({
            action: 'updateUser',
            data: {
                uid: user.uid,
                nombre: user.nombre,
                password: newPassword || undefined,
            },
        });
        alert('¡Usuario actualizado con éxito!');
        setNewPassword('');
      } catch (error) {
          console.error("Error al actualizar:", error);
          alert('No se pudo actualizar el usuario.');
      } finally {
          setIsSaving(false);
      }
  };

  const handleCourseToggle = async (courseId: string, isEnrolled: boolean) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
        if (isEnrolled) {
            await updateDoc(userDocRef, { cursosInscritos: arrayRemove(courseId) });
            setUser(prev => prev ? ({ ...prev, cursosInscritos: prev.cursosInscritos.filter(id => id !== courseId) }) : null);
        } else {
            await updateDoc(userDocRef, { cursosInscritos: arrayUnion(courseId) });
            setUser(prev => prev ? ({ ...prev, cursosInscritos: [...prev.cursosInscritos, courseId] }) : null);
        }
    } catch (error) {
        console.error("Error al cambiar inscripción:", error);
        alert('No se pudo actualizar la inscripción.');
    }
  };
  
  if (loading) return <p className="text-center mt-12">Cargando datos del alumno...</p>;
  if (!user) return <p className="text-center mt-12">Alumno no encontrado.</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <button onClick={() => router.back()} className="text-primary mb-8 hover:underline">← Volver a Alumnos</button>
      <h1 className="text-4xl text-center font-bold text-primary mb-10">Editar Alumno</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Formulario de Datos */}
        <div className="bg-surface p-8 rounded-lg shadow-lg border border-primary/20">
          <h2 className="text-2xl font-bold text-primary mb-6">Datos Personales</h2>
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <div>
              <label className="block text-text-secondary font-bold mb-2">Nombre Completo</label>
              <input type="text" value={user.nombre} onChange={(e) => setUser({...user, nombre: e.target.value})} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-text-secondary font-bold mb-2">Correo Electrónico</label>
              <input type="email" value={user.email} disabled className="bg-gray-800 shadow border border-gray-700 rounded w-full py-2 px-3 text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-text-secondary font-bold mb-2">Nueva Contraseña (opcional)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar" className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" />
            </div>
            <button type="submit" disabled={isSaving} className="w-full bg-primary text-background font-bold py-3 px-4 rounded-full hover:opacity-90 disabled:bg-gray-500">
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Gestión de Cursos */}
        <div className="bg-surface p-8 rounded-lg shadow-lg border border-primary/20">
          <h2 className="text-2xl font-bold text-primary mb-6">Gestionar Cursos</h2>
          <div className="space-y-3">
            {allCourses.map(course => {
              const isEnrolled = user.cursosInscritos.includes(course.id);
              return (
                <div key={course.id} className="flex justify-between items-center bg-background p-3 rounded-md">
                  <span className="text-text-secondary">{course.title}</span>
                  <button onClick={() => handleCourseToggle(course.id, isEnrolled)}
                    className={`text-xs font-bold py-1 px-3 rounded-full transition-colors ${
                        isEnrolled 
                        ? 'bg-red-600/20 text-red-300 hover:bg-red-500 hover:text-white' 
                        : 'bg-green-600/20 text-green-300 hover:bg-green-500 hover:text-white'
                    }`}
                  >
                    {isEnrolled ? 'Dar de Baja' : 'Inscribir'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
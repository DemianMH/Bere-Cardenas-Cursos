// RUTA: src/app/admin/alumnos/[userId]/page.tsx

"use client";
import { useEffect, useState } from 'react';
// Importamos setDoc
import { doc, getDoc, setDoc, arrayUnion, arrayRemove, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, app } from '@/lib/firebase'; // Importamos 'app'
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
        // --- LÓGICA DE CARGA MEJORADA ---
        
        // 1. Cargar datos del usuario desde Firestore
        const userDocRef = doc(db, 'users', params.userId);
        const userSnap = await getDoc(userDocRef);
        let userData: UserProfile;

        if (userSnap.exists()) {
          const data = userSnap.data();
          userData = {
            uid: userSnap.id,
            nombre: data.nombre || '',
            email: data.email || '', // Firestore tiene el email
            cursosInscritos: data.cursosInscritos || [],
          };
        } else {
          // 2. Si no existe en Firestore, creamos un perfil "temporal"
          //    con el UID y (opcionalmente) cargamos el email desde Auth.
          //    Por ahora, lo creamos vacío para que la UI funcione.
          userData = {
            uid: params.userId,
            nombre: '', // El admin lo puede llenar
            email: 'Cargando...', // Pondremos el email de Auth
            cursosInscritos: [],
          };
          
          // (Opcional pero recomendado) Intentar obtener email desde Auth
          // Esto requiere modificar la Cloud Function, por ahora usamos un placeholder
          // Idealmente, llamarías a una función 'getUser'
        }

        setUser(userData);

        // --- FIN DE LÓGICA MEJORADA ---

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
        const functions = getFunctions(app, 'us-central1'); // Especificar región
        const manageUser = httpsCallable(functions, 'manageUser');
        
        // Esta función (manageUser) ya usa setDoc con merge:true en el backend
        // así que creará el documento si no existe.
        await manageUser({
            action: 'updateUser',
            data: {
                uid: user.uid,
                nombre: user.nombre,
                password: newPassword || undefined,
            },
        });

        // Actualizar el email en el documento de Firestore también
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { email: user.email }, { merge: true });

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
            // --- CORRECCIÓN AQUÍ ---
            // Usamos setDoc con merge para evitar el error "No document to update"
            await setDoc(userDocRef, { 
              cursosInscritos: arrayRemove(courseId) 
            }, { merge: true });
            // --- FIN DE CORRECCIÓN ---
            
            setUser(prev => prev ? ({ ...prev, cursosInscritos: prev.cursosInscritos.filter(id => id !== courseId) }) : null);
        } else {
            // --- CORRECCIÓN AQUÍ ---
            // Usamos setDoc con merge para crear el doc si no existe
            await setDoc(userDocRef, { 
              cursosInscritos: arrayUnion(courseId) 
            }, { merge: true });
            // --- FIN DE CORRECCIÓN ---

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
              {/* Permitimos editar el email aquí para guardarlo en Firestore */}
              <input type="email" value={user.email} onChange={(e) => setUser({...user, email: e.target.value})} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" />
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
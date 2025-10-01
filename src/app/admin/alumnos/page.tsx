// RUTA: src/app/admin/alumnos/page.tsx

"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface UserData {
  uid: string;
  nombre: string;
  email: string;
  cursosInscritos?: string[];
}

export default function AdminAlumnosPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const functions = getFunctions();
        const manageUser = httpsCallable(functions, 'manageUser');
        
        // 1. Obtener la lista de usuarios de Firebase Auth
        const authUsersResult: any = await manageUser({ action: 'listUsers' });
        if (!authUsersResult.data.success) {
          throw new Error('No se pudo obtener la lista de usuarios de Auth.');
        }
        const authUsers = authUsersResult.data.users;

        // 2. Obtener los datos de Firestore (para los cursos)
        const firestoreUsersSnapshot = await getDocs(query(collection(db, 'users')));
        const firestoreUsersMap = new Map<string, UserData>();
        firestoreUsersSnapshot.forEach(doc => {
          firestoreUsersMap.set(doc.id, doc.data() as UserData);
        });

        // 3. Combinar los datos
        const combinedUsers = authUsers.map((authUser: any) => {
          const firestoreUser = firestoreUsersMap.get(authUser.uid);
          return {
            ...authUser,
            nombre: firestoreUser?.nombre || authUser.email, // Usar nombre de Firestore si existe
            cursosInscritos: firestoreUser?.cursosInscritos || [],
          };
        });

        setUsers(combinedUsers);
      } catch (error) {
        console.error("Error al cargar los alumnos:", error);
        alert('No se pudieron cargar los alumnos.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <p className="text-center mt-12 text-lg">Cargando alumnos...</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-primary">Gestionar Alumnos</h1>
        {/* Futuro botón para crear nuevo alumno */}
      </div>
      <div className="bg-surface p-6 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-primary/30">
            <tr>
              <th className="p-4 text-text-primary">Nombre</th>
              <th className="p-4 text-text-primary">Email</th>
              <th className="p-4 text-text-primary">Cursos Inscritos</th>
              <th className="p-4 text-text-primary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid} className="border-b border-gray-700 hover:bg-background">
                <td className="p-4">{user.nombre}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">{user.cursosInscritos?.length || 0}</td>
                <td className="p-4">
                  <Link href={`/admin/alumnos/${user.uid}`}>
                    <span className="text-primary hover:underline">Editar</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
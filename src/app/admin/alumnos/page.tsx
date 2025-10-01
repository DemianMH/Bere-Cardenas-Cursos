"use client";
import { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import Link from 'next/link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';

interface UserData {
  uid: string;
  nombre: string;
  email: string;
  cursosInscritos?: string[];
}

export default function AdminAlumnosPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || user.rol !== 'docente') {
        if (!authLoading) setLoading(false);
        return; 
      }

      try {
        const functions = getFunctions(app, 'us-central1');
        const manageUser = httpsCallable(functions, 'manageUser');
        
        const authUsersResult: any = await manageUser({ action: 'listUsers' });
        if (!authUsersResult.data.success) {
          throw new Error('No se pudo obtener la lista de usuarios de Auth.');
        }
        const authUsers = authUsersResult.data.users;

        const firestoreUsersSnapshot = await getDocs(query(collection(db, 'users')));
        const firestoreUsersMap = new Map<string, UserData>();
        firestoreUsersSnapshot.forEach(doc => {
          firestoreUsersMap.set(doc.id, doc.data() as UserData);
        });

        const combinedUsers = authUsers.map((authUser: any) => {
          const firestoreUser = firestoreUsersMap.get(authUser.uid);
          return {
            ...authUser,
            nombre: firestoreUser?.nombre || authUser.email,
            cursosInscritos: firestoreUser?.cursosInscritos || [],
          };
        });

        setUsers(combinedUsers);
      } catch (error: any) {
        console.error("Error al cargar los alumnos:", error.message);
        alert(`Error al cargar alumnos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading) {
        fetchUsers();
    }
  }, [user, authLoading]);

  if (loading || authLoading) return <p className="text-center mt-12 text-lg">Cargando alumnos...</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-primary">Gestionar Alumnos</h1>
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
            {users.length > 0 ? (
              users.map(user => (
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
              ))
            ) : (
                <tr>
                    <td colSpan={4} className="text-center p-8 text-text-secondary">No se encontraron alumnos.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

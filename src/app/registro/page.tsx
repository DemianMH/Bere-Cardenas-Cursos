// src/app/registro/page.tsx

"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function RegistroPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verificación de que las contraseñas coinciden
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      // 1. Crear el usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Guardar información adicional del usuario en Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nombre: nombre,
        email: user.email,
        rol: 'estudiante', // Rol por defecto para nuevos registros
        cursosInscritos: [] // Lista inicial de cursos
      });
      
      // 3. Redirigir al usuario a su panel
      router.push('/mis-cursos');

    } catch (err: any) {
      // Manejo de errores comunes de Firebase
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Ocurrió un error al crear la cuenta.');
      }
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <form onSubmit={handleRegister} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <h1 className="text-3xl text-center font-bold text-primary-dark mb-8">
            Crear Cuenta
          </h1>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nombre">
              Nombre Completo
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              id="nombre" type="text" placeholder="Tu nombre"
              value={nombre} onChange={(e) => setNombre(e.target.value)} required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              id="email" type="email" placeholder="tu@correo.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              id="password" type="password" placeholder="******************"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              Confirmar Contraseña
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              id="confirmPassword" type="password" placeholder="******************"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
            />
          </div>
          
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          
          <div className="flex items-center justify-center flex-col">
            <button
              className="bg-primary-medium hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-full w-full"
              type="submit"
            >
              Registrarse
            </button>
            <p className="text-center text-gray-500 text-xs mt-4">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="text-primary-medium hover:underline">
                Inicia Sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
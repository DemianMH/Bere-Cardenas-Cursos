// src/app/login/page.tsx

"use client";

import { useState } from 'react';
import Link from 'next/link'; // Asegúrate de importar Link
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/mis-cursos'); 
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') { // Código de error actualizado para v9+
        setError('El correo electrónico o la contraseña son incorrectos.');
      } else {
        setError('Ocurrió un error. Por favor, inténtalo de nuevo.');
      }
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <h1 className="text-3xl text-center font-bold text-primary-dark mb-8">
            Iniciar Sesión
          </h1>
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
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              id="password" type="password" placeholder="******************"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
          
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

          <div className="flex items-center justify-center flex-col">
            <button
              className="bg-primary-medium hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-full w-full"
              type="submit"
            >
              Entrar
            </button>
            {/* --- LÍNEA AÑADIDA --- */}
            <p className="text-center text-gray-500 text-xs mt-4">
              ¿No tienes una cuenta?{' '}
              <Link href="/registro" className="text-primary-medium hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
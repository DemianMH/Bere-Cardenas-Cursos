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
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nombre: nombre,
        email: user.email,
        rol: 'estudiante',
        cursosInscritos: []
      });
      router.push('/mis-cursos');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else {
        setError('Ocurrió un error al crear la cuenta.');
      }
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <form onSubmit={handleRegister} className="bg-surface shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 border border-primary/20">
          <h1 className="text-3xl text-center font-bold text-primary mb-8">Crear Cuenta</h1>
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="nombre">Nombre Completo</label>
            <input className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:border-primary" id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="email">Correo Electrónico</label>
            <input className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:border-primary" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="password">Contraseña</label>
            <input className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:border-primary" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="mb-6">
            <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:border-primary" id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-center flex-col">
            <button className="bg-primary hover:opacity-90 text-background font-bold py-2 px-4 rounded-full w-full" type="submit">Registrarse</button>
            <p className="text-center text-text-secondary text-xs mt-4">
              ¿Ya tienes una cuenta? <Link href="/login" className="text-primary hover:underline">Inicia Sesión aquí</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/'); // <-- Redirige al inicio
    } catch (err: any) {
      setError('El correo electrónico o la contraseña son incorrectos.');
      console.error(err);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetMessage(null);
    if (!email.trim()) {
      setError('Escribe tu correo electrónico arriba y da clic de nuevo en "¿Olvidaste tu contraseña?".');
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetMessage('Te enviamos un correo con instrucciones para recuperar tu contraseña. Revisa también tu bandeja de spam.');
    } catch (err: any) {
      setResetMessage('Si el correo existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="bg-surface shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 border border-primary/20">
          <h1 className="text-3xl text-center font-bold text-primary mb-8">Iniciar Sesión</h1>
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="email">Correo Electrónico</label>
            <input
              className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:shadow-outline focus:border-primary"
              id="email" type="email" placeholder="tu@correo.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          
          <div className="mb-6 relative">
            <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="password">Contraseña</label>
            <input
              className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:shadow-outline focus:border-primary pr-10"
              id="password" 
              type={showPassword ? 'text' : 'password'}
              placeholder="******************"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 top-7 flex items-center pr-3 text-text-secondary hover:text-primary"
              aria-label="Mostrar u ocultar contraseña"
            >
              {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
            </button>
          </div>

          <div className="text-right mb-4 -mt-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={sendingReset}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {sendingReset ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
            </button>
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          {resetMessage && <p className="text-green-400 text-xs italic mb-4">{resetMessage}</p>}
          <div className="flex items-center justify-center flex-col">
            <button className="bg-primary hover:opacity-90 text-background font-bold py-2 px-4 rounded-full w-full" type="submit">Entrar</button>
            <p className="text-center text-text-secondary text-xs mt-4">
              ¿No tienes una cuenta?{' '}
              <Link href="/registro" className="text-primary hover:underline">Regístrate aquí</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
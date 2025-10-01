"use client";
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

export default function SetupAdminPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Por favor, ingresa un correo electrónico.');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const functions = getFunctions(app, 'us-central1');
      const addAdminRole = httpsCallable(functions, 'addAdminRole');
      const result: any = await addAdminRole({ email });
      setMessage(result.data.message);
    } catch (error: any) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16 flex justify-center">
      <div className="w-full max-w-md">
        <form onSubmit={handleSetAdmin} className="bg-surface shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 border border-primary/20">
          <h1 className="text-3xl text-center font-bold text-primary mb-8">Asignar Rol de Docente</h1>
          <p className="text-center text-text-secondary text-xs mb-6">
            Ingresa el email del usuario que será administrador. Esto le dará acceso a todas las secciones de gestión.
          </p>
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-bold mb-2" htmlFor="email">
              Correo Electrónico del Administrador
            </label>
            <input
              className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-2 px-3 text-text-primary leading-tight focus:outline-none focus:border-primary"
              id="email"
              type="email"
              placeholder="admin@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-center flex-col">
            <button
              className="bg-primary hover:opacity-90 text-background font-bold py-2 px-4 rounded-full w-full disabled:bg-gray-500"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Asignando...' : 'Convertir en Docente'}
            </button>
          </div>
          {message && (
            <p className="text-center text-sm mt-6 p-3 rounded-md bg-background border border-primary/50">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}


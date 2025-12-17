// RUTA: src/app/admin-setup/page.tsx

"use client";
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export default function AdminSetupPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const makeAdmin = async () => {
    if (!user) {
      setMessage("¡Error! Debes estar logueado para hacer esto.");
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const functions = getFunctions(app, 'us-central1');
      const addAdminRole = httpsCallable(functions, 'addAdminRole');

      const emailToMakeAdmin = "admin@gmail.com"; // <-- EL EMAIL DE TU ADMIN

      const result: any = await addAdminRole({ email: emailToMakeAdmin });

      setMessage(`Éxito: ${result.data.message}. ¡YA ERES DOCENTE!`);
    } catch (err: any) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-primary mb-8">Página de Setup de Admin</h1>
      <p className="text-text-secondary mb-4">
        Esto asignará el rol de 'docente' a la cuenta: <strong>admin@gmail.com</strong>
      </p>
      <p className="text-text-secondary mb-8">
        Logueado como: {user ? user.email : "Nadie"}
      </p>

      <button
        onClick={makeAdmin}
        disabled={loading || !user}
        className="bg-primary hover:opacity-90 text-background font-bold py-3 px-6 rounded-full disabled:bg-gray-500"
      >
        {loading ? 'Asignando...' : "Hacer 'docente' a admin@gmail.com"}
      </button>

      {message && (
        <p className="mt-8 text-lg text-primary">{message}</p>
      )}
    </div>
  );
}
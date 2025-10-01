// RUTA: src/app/admin/set-admin/page.tsx

"use client";
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function SetAdminPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            alert('Por favor, ingresa un email.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const functions = getFunctions();
            const setAdminRole = httpsCallable(functions, 'setAdminRole');
            const result: any = await setAdminRole({ email });
            setMessage(result.data.message);
        } catch (error: any) {
            console.error(error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-6 py-12">
            <h1 className="text-4xl text-center font-bold text-primary mb-10">Asignar Rol de Docente</h1>
            <div className="max-w-md mx-auto bg-surface p-8 rounded-lg shadow-lg">
                <p className="text-text-secondary mb-4">
                    Usa esta herramienta para promover un usuario a "docente". Esto le dará acceso a los paneles de administración.
                    **Importante:** Después de asignar el rol, el usuario debe cerrar y volver a iniciar sesión.
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-text-secondary font-bold mb-2" htmlFor="email">
                            Correo del Usuario
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary"
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-primary text-background font-bold py-3 px-4 rounded-full hover:opacity-90 disabled:bg-gray-500">
                        {loading ? 'Asignando...' : 'Hacer Docente'}
                    </button>
                </form>
                {message && (
                    <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}
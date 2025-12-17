"use client";
import { useState } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function NuevoCursoPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // Estado para el precio
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(price) <= 0) {
      setError('El precio debe ser un número mayor a cero.');
      return;
    }
    setLoading(true);
    try {
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const newOrder = coursesSnapshot.size + 1;
      
      const docRef = await addDoc(collection(db, "courses"), {
        title,
        description,
        price: Number(price), // Guardamos el precio como número
        order: newOrder
      });
      alert('¡Curso creado con éxito!');
      router.push(`/admin/cursos/${docRef.id}`);
    } catch (err) {
      console.error(err);
      setError('No se pudo crear el curso.');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8">Crear Nuevo Curso</h1>
      <div className="bg-surface p-8 rounded-lg shadow-lg max-w-2xl mx-auto border border-primary/20">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="title">Título del Curso*</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" required />
          </div>
          <div className="mb-6">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="description">Descripción Corta*</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" rows={4} required></textarea>
          </div>
          {/* --- CAMPO DE PRECIO AÑADIDO --- */}
          <div className="mb-6">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="price">Precio (MXN)*</label>
            <input id="price" type="number" placeholder="Ej: 1500" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" required />
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-primary text-background font-bold py-2 px-4 rounded-full hover:opacity-90 disabled:bg-gray-500">
            {loading ? 'Creando...' : 'Crear y Añadir Temario'}
          </button>
        </form>
      </div>
    </div>
  );
}
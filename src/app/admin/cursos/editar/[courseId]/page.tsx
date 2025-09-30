"use client";
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function EditarCursoPage({ params }: { params: { courseId: string } }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // Estado para el precio
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const courseDocRef = doc(db, 'courses', params.courseId);
        const courseSnap = await getDoc(courseDocRef);
        if (courseSnap.exists()) {
          const courseData = courseSnap.data();
          setTitle(courseData.title);
          setDescription(courseData.description);
          setPrice(courseData.price || ''); // Cargamos el precio
        } else {
          setError('Este curso no existe.');
        }
      } catch (err) {
        setError('Error al cargar los datos del curso.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourseData();
  }, [params.courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(price) <= 0) {
      setError('El precio debe ser un número mayor a cero.');
      return;
    }
    setLoading(true);
    try {
      const courseDocRef = doc(db, 'courses', params.courseId);
      await updateDoc(courseDocRef, {
        title,
        description,
        price: Number(price) // Actualizamos el precio
      });
      alert('¡Curso actualizado con éxito!');
      router.push('/admin/cursos');
    } catch (err) {
      setError('No se pudo actualizar el curso.');
      console.error(err);
    }
    setLoading(false);
  };
  
  if (loading) return <p className="text-center mt-12 text-text-secondary">Cargando editor...</p>;

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl text-center font-bold text-primary mb-10">Editar Curso</h1>
      <div className="bg-surface p-8 rounded-lg shadow-lg max-w-2xl mx-auto border border-primary/20">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="title">Título del Curso*</label>
            <input 
              id="title" 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-3 px-4 text-text-primary leading-tight focus:outline-none focus:border-primary" 
              required 
            />
          </div>
          <div className="mb-6">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="description">Descripción Corta del Curso*</label>
            <textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="bg-background shadow appearance-none border border-gray-700 rounded w-full py-3 px-4 text-text-primary leading-tight focus:outline-none focus:border-primary" 
              rows={4} 
              required
            ></textarea>
          </div>
          {/* --- CAMPO DE PRECIO AÑADIDO --- */}
          <div className="mb-6">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="price">Precio (MXN)*</label>
            <input 
              id="price" 
              type="number" 
              placeholder="Ej: 1500" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" 
              required 
            />
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-primary text-background font-bold py-3 px-4 rounded-full hover:opacity-90 disabled:bg-gray-500 transition-opacity"
          >
            {loading ? 'Guardando Cambios...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
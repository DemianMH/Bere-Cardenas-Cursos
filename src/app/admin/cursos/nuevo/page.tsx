"use client";
import { useState } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function NuevoCursoPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [published, setPublished] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
      let imageUrl: string | null = null;
      if (imageFile) {
        const imageRef = ref(storage, `courses/covers/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const newOrder = coursesSnapshot.size + 1;

      const docRef = await addDoc(collection(db, "courses"), {
        title,
        description,
        price: Number(price),
        order: newOrder,
        published,
        imageUrl,
      });
      alert(published ? '¡Curso creado y publicado con éxito!' : '¡Curso creado como borrador! No es visible en el sitio hasta que lo publiques.');
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
          <div className="mb-6">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="price">Precio (MXN)*</label>
            <input id="price" type="number" placeholder="Ej: 1500" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" required />
          </div>
          <div className="mb-6">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="image">Imagen de Portada (Opcional)</label>
            <input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-background file:font-semibold cursor-pointer" />
          </div>
          <div className="mb-6 flex items-center gap-3 bg-background border border-gray-700 rounded p-3">
            <input id="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-5 h-5 accent-primary" />
            <label htmlFor="published" className="text-text-secondary">
              <span className="font-bold text-text-primary block">Publicar curso ahora</span>
              Si lo dejas sin marcar, el curso se guarda como borrador oculto: podrás armar el temario con calma y publicarlo cuando esté listo.
            </label>
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

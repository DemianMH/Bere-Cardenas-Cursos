"use client";
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import GalleryEditor from './GalleryEditor';
import CertificateTemplateUploader from './CertificateTemplateUploader';

export default function EditarCursoPage({ params }: { params: { courseId: string } }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [published, setPublished] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [resultadosImages, setResultadosImages] = useState<string[]>([]);
  const [testimoniosImages, setTestimoniosImages] = useState<string[]>([]);
  const [alumnasImages, setAlumnasImages] = useState<string[]>([]);
  const [certificateTemplateUrl, setCertificateTemplateUrl] = useState<string | null>(null);
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
          setPrice(courseData.price || '');
          setPublished(courseData.published !== false);
          setImageUrl(courseData.imageUrl || null);
          setResultadosImages(courseData.resultadosImages || []);
          setTestimoniosImages(courseData.testimoniosImages || []);
          setAlumnasImages(courseData.alumnasImages || []);
          setCertificateTemplateUrl(courseData.certificateTemplateUrl || null);
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
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const imageRef = ref(storage, `courses/covers/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const courseDocRef = doc(db, 'courses', params.courseId);
      await updateDoc(courseDocRef, {
        title,
        description,
        price: Number(price),
        published,
        imageUrl: finalImageUrl,
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
          <div className="mb-6">
            <label className="block text-text-secondary font-bold mb-2" htmlFor="image">Imagen de Portada</label>
            {imageUrl && !imageFile && (
              <div className="relative w-full aspect-video mb-3 rounded overflow-hidden border border-gray-700">
                <Image src={imageUrl} alt="Portada actual" fill className="object-cover" />
              </div>
            )}
            <input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-background file:font-semibold cursor-pointer" />
          </div>
          <div className="mb-6 flex items-center gap-3 bg-background border border-gray-700 rounded p-3">
            <input id="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-5 h-5 accent-primary" />
            <label htmlFor="published" className="text-text-secondary">
              <span className="font-bold text-text-primary block">Curso publicado (visible en el sitio)</span>
              Desmarca para ocultarlo mientras preparas actualizaciones, sin afectar a los alumnos ya inscritos.
            </label>
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

      <div className="max-w-2xl mx-auto mt-8">
        <h2 className="text-2xl font-bold text-primary mb-4 text-center">Secciones Visuales del Curso</h2>
        <p className="text-sm text-text-secondary/70 text-center mb-6">
          Estas imágenes se guardan al instante (no necesitas dar &quot;Guardar Cambios&quot;) y se muestran en la página pública del curso en carruseles automáticos.
        </p>
        <GalleryEditor
          courseId={params.courseId}
          field="resultadosImages"
          storageFolder="resultados"
          label="Resultados (antes / después)"
          helpText="Se muestran una por una con un efecto de transición suave."
          images={resultadosImages}
          onChange={setResultadosImages}
        />
        <GalleryEditor
          courseId={params.courseId}
          field="testimoniosImages"
          storageFolder="testimonios"
          label="Testimonios"
          helpText="Capturas de conversaciones o reseñas de alumnas. Se muestran en una franja que se desliza sola."
          images={testimoniosImages}
          onChange={setTestimoniosImages}
        />
        <GalleryEditor
          courseId={params.courseId}
          field="alumnasImages"
          storageFolder="alumnas"
          label="Alumnas Certificadas"
          helpText="Fotos grupales de generaciones anteriores. Se muestran en una franja que se desliza sola (en sentido contrario a testimonios)."
          images={alumnasImages}
          onChange={setAlumnasImages}
        />
        <CertificateTemplateUploader
          courseId={params.courseId}
          templateUrl={certificateTemplateUrl}
          onChange={setCertificateTemplateUrl}
        />
      </div>
    </div>
  );
}

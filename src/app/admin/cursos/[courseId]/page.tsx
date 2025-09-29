"use client";

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';

interface Lesson {
  id: string;
  title: string;
  textContent?: string;
  videoUrl?: string;
  supportMaterialUrl?: string;
  type?: 'video' | 'text';
}

export default function AdminEditLessonPage({ params }: { params: { courseId: string } }) {
  const [lessonTitle, setLessonTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  
  const [existingLessons, setExistingLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const router = useRouter();

  // Función para cargar las lecciones existentes
  const fetchLessons = async () => {
    setLoadingLessons(true);
    try {
      const lessonsRef = collection(db, `courses/${params.courseId}/lessons`);
      const q = query(lessonsRef, orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const lessonsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lesson[];
      setExistingLessons(lessonsData);
    } catch (error) {
      console.error("Error cargando el temario:", error);
    } finally {
      setLoadingLessons(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [params.courseId]);

  // Funciones para manejar edición y borrado (sin cambios)
  const handleSelectForEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setTextContent(lesson.textContent || '');
  };

  const handleCancelEdit = () => {
    setEditingLesson(null);
    setLessonTitle('');
    setTextContent('');
    setError(null);
  };
  
  const handleDelete = async (lessonId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta lección?")) {
      try {
        await deleteDoc(doc(db, `courses/${params.courseId}/lessons`, lessonId));
        alert("Lección eliminada.");
        fetchLessons();
      } catch (err) {
        alert("No se pudo eliminar la lección.");
      }
    }
  };

  // Función principal para guardar/actualizar lecciones
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!lessonTitle.trim()) {
      setError("El título de la lección es obligatorio.");
      return;
    }
    setLoading(true);

    try {
      let videoUrl = editingLesson?.videoUrl;
      if (videoFile) {
        const videoRef = ref(storage, `courses/${params.courseId}/videos/${Date.now()}_${videoFile.name}`);
        const uploadTask = uploadBytesResumable(videoRef, videoFile);
        videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }

      let supportMaterialUrl = editingLesson?.supportMaterialUrl;
      if (supportFile) {
        const supportRef = ref(storage, `courses/${params.courseId}/support/${Date.now()}_${supportFile.name}`);
        const uploadTask = uploadBytesResumable(supportRef, supportFile);
        supportMaterialUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }

      const lessonData = {
        title: lessonTitle,
        textContent: textContent,
        videoUrl: videoUrl || null,
        supportMaterialUrl: supportMaterialUrl || null,
        type: videoFile || videoUrl ? 'video' : 'text',
      };

      if (editingLesson) {
        await updateDoc(doc(db, `courses/${params.courseId}/lessons`, editingLesson.id), lessonData);
        alert("Lección actualizada con éxito.");
      } else {
        await addDoc(collection(db, `courses/${params.courseId}/lessons`), {
          ...lessonData,
          createdAt: serverTimestamp(),
        });
        alert("Lección añadida con éxito.");
      }
      
      handleCancelEdit();
      fetchLessons();
    } catch (err) {
      console.error("Error al guardar:", err);
      setError("Ocurrió un error al guardar la lección.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-primary mb-8 text-center">
        Editor de Temario: {decodeURIComponent(params.courseId)}
      </h1>

      <div className="bg-surface p-8 rounded-lg shadow-lg max-w-3xl mx-auto border border-primary/20 mb-8">
        <h2 className="text-2xl font-bold text-primary mb-4">Temario del Curso</h2>
        {loadingLessons ? <p className="text-text-secondary">Cargando...</p> : (
          <ul className="space-y-3">
            {existingLessons.length > 0 ? (
              existingLessons.map(lesson => (
                <li key={lesson.id} className="flex justify-between items-center bg-background p-3 rounded-md">
                  <span className="text-text-secondary">{lesson.title}</span>
                  <div className="flex gap-3">
                    <button onClick={() => handleSelectForEdit(lesson)} className="text-xs text-blue-400 hover:underline">Editar</button>
                    <button onClick={() => handleDelete(lesson.id)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-text-secondary">Este curso aún no tiene lecciones.</p>
            )}
          </ul>
        )}
      </div>
      
      <div className="bg-surface p-8 rounded-lg shadow-lg max-w-3xl mx-auto border border-primary/20">
         <h2 className="text-2xl font-bold text-primary mb-6">{editingLesson ? 'Editando Lección' : 'Añadir Nueva Lección'}</h2>
        <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label className="block text-text-secondary font-bold mb-2" htmlFor="lessonTitle">Título de la Lección*</label>
                <input id="lessonTitle" type="text" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" required />
            </div>
            <div className="mb-6">
                <label className="block text-text-secondary font-bold mb-2" htmlFor="textContent">Material de Lectura (Si no hay video, este será el contenido principal)</label>
                <textarea id="textContent" value={textContent} onChange={(e) => setTextContent(e.target.value)} className="bg-background shadow border border-gray-700 rounded w-full py-2 px-3 text-text-primary focus:outline-none focus:border-primary" rows={5}></textarea>
            </div>
            <div className="mb-6">
                <label className="block text-text-secondary font-bold mb-2" htmlFor="videoFile">Archivo de Video (Opcional)</label>
                <input id="videoFile" type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-background file:font-semibold cursor-pointer" />
            </div>
            <div className="mb-6">
                <label className="block text-text-secondary font-bold mb-2" htmlFor="supportFile">Material de Apoyo (PDF, etc.)</label>
                <input id="supportFile" type="file" accept=".pdf,.doc,.docx,.zip" onChange={(e) => setSupportFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-background file:font-semibold cursor-pointer" />
            </div>
            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
            <div className="flex gap-4 mt-4">
              {editingLesson && <button type="button" onClick={handleCancelEdit} className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-full hover:bg-gray-700">Cancelar Edición</button>}
              <button type="submit" disabled={loading} className="w-full bg-primary text-background font-bold py-3 px-4 rounded-full hover:opacity-90 disabled:bg-gray-500 transition-opacity">
                  {loading ? 'Guardando...' : (editingLesson ? 'Guardar Cambios' : 'Añadir Lección')}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
}
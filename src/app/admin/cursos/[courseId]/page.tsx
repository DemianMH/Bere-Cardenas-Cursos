"use client";

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';

export default function AdminEditLessonPage({ params }: { params: { courseId: string } }) {
  const [lessonTitle, setLessonTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle || !videoFile) {
      setError("El título y el video son obligatorios.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const videoUrl = await uploadFile(videoFile, `courses/${params.courseId}/videos/${videoFile.name}`);
      let supportMaterialUrl = null;
      if (supportFile) {
        supportMaterialUrl = await uploadFile(supportFile, `courses/${params.courseId}/support/${supportFile.name}`);
      }
      await addDoc(collection(db, `courses/${params.courseId}/lessons`), {
        title: lessonTitle,
        textContent: textContent,
        videoUrl: videoUrl,
        supportMaterialUrl: supportMaterialUrl,
        createdAt: serverTimestamp(),
      });
      alert('¡Lección añadida!');
      router.refresh();
    } catch (uploadError) {
      setError("Ocurrió un error al subir los archivos.");
      console.error(uploadError);
    } finally {
      setIsUploading(false);
      setLessonTitle('');
      setTextContent('');
      setVideoFile(null);
      setSupportFile(null);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-primary-dark mb-8">
        Añadir Lección a: {decodeURIComponent(params.courseId)}
      </h1>
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
        <form onSubmit={handleUpload}>
            <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2" htmlFor="lessonTitle">Título de la Lección*</label>
                <input id="lessonTitle" type="text" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="shadow border rounded w-full py-2 px-3" required />
            </div>
            <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2" htmlFor="textContent">Material de Lectura</label>
                <textarea id="textContent" value={textContent} onChange={(e) => setTextContent(e.target.value)} className="shadow border rounded w-full py-2 px-3" rows={5}></textarea>
            </div>
            <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2" htmlFor="videoFile">Archivo de Video*</label>
                <input id="videoFile" type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0" required />
            </div>
            <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2" htmlFor="supportFile">Material de Apoyo (PDF, etc.)</label>
                <input id="supportFile" type="file" accept=".pdf,.doc,.docx,.zip" onChange={(e) => setSupportFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0" />
            </div>
            {isUploading && <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4"><div className="bg-primary-medium h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div></div>}
            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
            <button type="submit" disabled={isUploading} className="w-full bg-primary-medium text-white font-bold py-2 px-4 rounded-full hover:bg-primary-dark disabled:bg-gray-400">
                {isUploading ? `Subiendo... ${Math.round(uploadProgress)}%` : 'Guardar Lección'}
            </button>
        </form>
      </div>
    </div>
  );
}
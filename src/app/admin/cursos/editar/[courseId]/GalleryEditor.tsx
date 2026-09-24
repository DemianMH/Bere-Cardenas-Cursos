"use client";
import { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import Image from 'next/image';

interface GalleryEditorProps {
  courseId: string;
  field: 'resultadosImages' | 'testimoniosImages' | 'alumnasImages';
  storageFolder: string;
  label: string;
  helpText: string;
  images: string[];
  onChange: (images: string[]) => void;
}

export default function GalleryEditor({ courseId, field, storageFolder, label, helpText, images, onChange }: GalleryEditorProps) {
  const [uploading, setUploading] = useState(false);

  const handleAdd = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const imageRef = ref(storage, `courses/${courseId}/${storageFolder}/${Date.now()}_${file.name}`);
        const result = await uploadBytes(imageRef, file);
        uploadedUrls.push(await getDownloadURL(result.ref));
      }
      const courseDocRef = doc(db, 'courses', courseId);
      await updateDoc(courseDocRef, { [field]: arrayUnion(...uploadedUrls) });
      onChange([...images, ...uploadedUrls]);
    } catch (error) {
      console.error(`Error al subir imágenes de ${field}:`, error);
      alert('No se pudieron subir una o más imágenes.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (url: string) => {
    if (!window.confirm('¿Quitar esta imagen?')) return;
    try {
      const courseDocRef = doc(db, 'courses', courseId);
      await updateDoc(courseDocRef, { [field]: arrayRemove(url) });
      onChange(images.filter((img) => img !== url));

      const match = url.match(/\/o\/(.+?)\?/);
      if (match) {
        const path = decodeURIComponent(match[1]);
        deleteObject(ref(storage, path)).catch(() => {});
      }
    } catch (error) {
      console.error(`Error al quitar imagen de ${field}:`, error);
      alert('No se pudo quitar la imagen.');
    }
  };

  return (
    <div className="mb-8 bg-background border border-gray-700 rounded p-4">
      <h3 className="font-bold text-text-primary mb-1">{label}</h3>
      <p className="text-xs text-text-secondary/70 mb-4">{helpText}</p>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
          {images.map((url) => (
            <div key={url} className="relative aspect-square rounded overflow-hidden border border-gray-700 group">
              <Image src={url} alt="" fill sizes="150px" className="object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center opacity-90 hover:opacity-100"
                aria-label="Quitar imagen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(e) => handleAdd(e.target.files)}
        className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-background file:font-semibold cursor-pointer disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-primary mt-2">Subiendo...</p>}
    </div>
  );
}

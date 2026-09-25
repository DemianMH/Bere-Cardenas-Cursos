"use client";
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

interface CertificateTemplateUploaderProps {
  courseId: string;
  templateUrl: string | null;
  onChange: (url: string) => void;
}

export default function CertificateTemplateUploader({ courseId, templateUrl, onChange }: CertificateTemplateUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('La plantilla debe ser un archivo PDF.');
      return;
    }
    setUploading(true);
    try {
      const fileRef = ref(storage, `courses/${courseId}/certificate-template/${Date.now()}_${file.name}`);
      const result = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(result.ref);
      await updateDoc(doc(db, 'courses', courseId), { certificateTemplateUrl: url });
      onChange(url);
    } catch (error) {
      console.error('Error al subir la plantilla de constancia:', error);
      alert('No se pudo subir la plantilla de constancia.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-8 bg-background border border-gray-700 rounded p-4">
      <h3 className="font-bold text-text-primary mb-1">Plantilla de Constancia (PDF)</h3>
      <p className="text-xs text-text-secondary/70 mb-4">
        Diseño en PDF que se usará para la constancia automática de este curso. El nombre del alumno se
        escribe automáticamente en el mismo lugar del diseño (el espacio en blanco bajo &quot;DE RECONOCIMIENTO&quot;).
      </p>

      {templateUrl ? (
        <a href={templateUrl} target="_blank" rel="noopener noreferrer" className="inline-block mb-4 text-primary text-sm hover:underline">
          📄 Ver plantilla actual
        </a>
      ) : (
        <p className="text-sm text-yellow-300/80 mb-4">Aún no has subido una plantilla. Sin ella, las constancias de este curso no se generarán.</p>
      )}

      <input
        type="file"
        accept="application/pdf"
        disabled={uploading}
        onChange={(e) => handleUpload(e.target.files ? e.target.files[0] : null)}
        className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary file:text-background file:font-semibold cursor-pointer disabled:opacity-50"
      />
      {uploading && <p className="text-xs text-primary mt-2">Subiendo...</p>}
    </div>
  );
}

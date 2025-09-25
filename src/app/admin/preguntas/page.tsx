// src/app/admin/preguntas/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface Question {
  id: string;
  userName: string;
  courseId: string;
  lessonTitle: string;
  question: string;
  status: string;
  createdAt: any;
}

export default function AdminPreguntasPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user || user.rol !== 'docente') return;
      
      setLoading(true);
      try {
        const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const questionsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Question[];
        setQuestions(questionsData);
      } catch (error) {
        console.error("Error al cargar las preguntas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [user]);

  if (loading) {
    return <p className="text-center mt-12">Cargando preguntas...</p>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl text-center font-bold text-primary-dark mb-10">
        Preguntas de Alumnos
      </h1>
      <div className="space-y-6">
        {questions.length > 0 ? (
          questions.map(q => (
            <div key={q.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg text-primary-dark">{q.userName}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  q.status === 'pendiente' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                }`}>
                  {q.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Curso: {q.courseId} | Lección: {q.lessonTitle}
              </p>
              <p className="text-gray-700 mb-4">{q.question}</p>
              {/* Aquí iría la lógica para responder */}
              <button className="text-primary-medium font-bold hover:underline">
                Responder
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No hay preguntas por el momento.</p>
        )}
      </div>
    </div>
  );
}
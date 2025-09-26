"use client";

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
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
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const questionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[];
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
    return <p className="text-center mt-12 text-text-secondary">Cargando preguntas...</p>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl text-center font-bold text-primary mb-10">
        Preguntas de Alumnos
      </h1>
      <div className="space-y-6 max-w-4xl mx-auto">
        {questions.length > 0 ? (
          questions.map(q => (
            <div key={q.id} className="bg-surface p-6 rounded-lg shadow-lg border border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg text-primary">{q.userName}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  q.status === 'pendiente' ? 'bg-yellow-200/20 text-yellow-300' : 'bg-green-200/20 text-green-300'
                }`}>
                  {q.status}
                </span>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Curso: {q.courseId} | Lección: {q.lessonTitle}
              </p>
              <p className="text-text-primary mb-4">{q.question}</p>
              <button className="text-primary font-bold hover:underline">
                Responder
              </button>
            </div>
          ))
        ) : (
          <div className="text-center bg-surface p-8 rounded-lg shadow-lg border border-primary/20">
            <p className="text-text-secondary">No hay preguntas por el momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
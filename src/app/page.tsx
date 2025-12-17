"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';

interface Course {
  id: string;
  title: string;
  description: string;
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesCollection = collection(db, 'courses');
        const q = query(coursesCollection, orderBy('order'), limit(3));
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Course[];
        setCourses(coursesData);
      } catch (error) {
        console.error("Error al cargar los cursos: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="bg-background">
      <section className="bg-surface text-center py-20 px-6">
        <div className="container mx-auto">
          <h1 className="text-4xl md:text-5xl text-text-primary mb-4">
            Transforma Vidas a Través de la Estética Profesional
          </h1>
          <p className="text-lg md:text-xl text-text-secondary mb-8">
            Fórmate como especialista con nosotros, con tratamientos respaldados por conocimiento, ética y pasión.
          </p>
          <Link href="/cursos" className="bg-primary text-background font-bold py-3 px-8 rounded-full text-lg hover:opacity-90 transition-opacity transform hover:scale-105">
            Explorar Cursos
          </Link>
        </div>
      </section>

      <section id="acerca-de" className="py-16">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">Quién está detrás</h2>
            <p className="text-lg text-text-secondary mb-4">
              Soy <span className="font-bold text-primary">Bere Cárdenas</span>, abogada de formación y cosmetóloga cosmiatra, con más de 10 años de experiencia y diplomado en dermatofuncional.
            </p>
            <p className="text-text-secondary mb-4">
              Esta combinación de conocimientos me permite ofrecer una visión única: unir la parte legal y normativa con la práctica estética profesional.
            </p>
            <h3 className="text-2xl font-bold text-text-primary mt-6 mb-2">Nuestra Misión</h3>
            <p className="text-text-secondary">
              Formar profesionales de la estética que trabajen con protocolos seguros, tecnologías avanzadas y fundamentos científicos.
            </p>
          </div>
          <div className="text-center">
            <div className="text-center">
                        <Image
                          src="/berenice.jpg"
                          alt="Foto de Bere Cárdenas"
                          width={400}
                          height={400}
                          className="rounded-lg object-cover mx-auto border-2 border-primary"
                        />
                      </div>
          </div>
        </div>
      </section>
      
      <section id="cursos" className="bg-surface py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-8">Nuestros Cursos Destacados</h2>
          {loading ? (
            <p>Cargando cursos...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id} className="bg-background rounded-lg shadow-lg p-6 transform hover:-translate-y-2 transition-transform flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-primary mb-2">{course.title}</h3>
                    <p className="text-text-secondary mb-4">{course.description}</p>
                  </div>
                  <Link href={`/cursos/${course.id}`} className="text-primary font-bold hover:text-text-primary mt-auto">
                    Ver más
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
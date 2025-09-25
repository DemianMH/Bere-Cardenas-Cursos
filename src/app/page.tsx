"use client"; // Necesario para cargar datos del lado del cliente

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Definimos el tipo para la información del curso que vamos a mostrar
interface Course {
  id: string;
  title: string;
  description: string;
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect se ejecuta cuando el componente se carga por primera vez
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Obtenemos los 3 primeros cursos ordenados por el campo 'order'
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
  }, []); // El array vacío asegura que esto solo se ejecute una vez

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="bg-primary-light text-center py-20 px-6">
        <div className="container mx-auto">
          <h1 className="text-4xl md:text-5xl text-primary-dark mb-4">
            Transforma Vidas a Través de la Estética Profesional
          </h1>
          <p className="text-lg md:text-xl text-primary-dark mb-8">
            Fórmate como especialista con nosotros, con tratamientos respaldados por conocimiento, ética y pasión.
          </p>
          <Link href="/cursos" className="bg-primary-medium text-white py-3 px-8 rounded-full text-lg hover:bg-primary-dark transition-transform transform hover:scale-105">
            Explorar Cursos
          </Link>
        </div>
      </section>

      {/* About Us Section */}
      <section id="acerca-de" className="py-16">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary-dark mb-4">Quién está detrás</h2>
            <p className="text-lg text-gray-700 mb-4">
              Soy <span className="font-bold text-primary-medium">Bere Cárdenas</span>, abogada de formación y cosmetóloga cosmiatra, con más de 10 años de experiencia y diplomado en dermatofuncional.
            </p>
            <p className="text-gray-600 mb-4">
              Esta combinación de conocimientos me permite ofrecer una visión única: unir la parte legal y normativa con la práctica estética profesional, garantizando a cada alumno no solo aprender técnicas actualizadas, sino también ejercer con seguridad jurídica y ética profesional.
            </p>
            <h3 className="text-2xl font-bold text-primary-dark mt-6 mb-2">Nuestra Misión</h3>
            <p className="text-gray-600">
              Formar cosmetólogos, cosmiatras y profesionales de la estética que trabajen con protocolos seguros, tecnologías avanzadas y fundamentos científicos, siempre dentro de un marco de respeto, responsabilidad y amor por la profesión.
            </p>
          </div>
          <div className="text-center">
            <div className="rounded-lg bg-primary-light w-80 h-80 mx-auto flex items-center justify-center">
               <span className="text-primary-dark">Foto Profesional</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Courses Preview Section - AHORA DINÁMICA */}
      <section id="cursos" className="bg-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-dark mb-8">Nuestros Cursos Destacados</h2>
          {loading ? (
            <p>Cargando cursos...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id} className="bg-primary-light rounded-lg shadow-lg p-6 transform hover:-translate-y-2 transition-transform flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-primary-dark mb-2">{course.title}</h3>
                    <p className="text-gray-600 mb-4">{course.description}</p>
                  </div>
                  <Link href={`/cursos/${course.id}`} className="text-primary-medium font-bold hover:underline mt-auto">
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
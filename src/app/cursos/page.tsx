import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nuestros Cursos',
  description: 'Explora los cursos y diplomados de cosmetología, cosmiatría y estética profesional de Bere Cárdenas. Protocolos seguros, tecnología avanzada y respaldo legal.',
  alternates: { canonical: '/cursos' },
};

// Refresca el catálogo cada minuto sin necesitar un nuevo despliegue
export const revalidate = 60;

interface Course {
  id: string;
  title: string;
  description: string;
  price?: number;
  imageUrl?: string;
  published?: boolean;
}

async function getPublishedCourses(): Promise<Course[]> {
  const coursesCollection = collection(db, 'courses');
  const q = query(coursesCollection, orderBy('order'));
  const querySnapshot = await getDocs(q);
  const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  return coursesData.filter(c => c.published !== false);
}

export default async function CursosPage() {
  const courses = await getPublishedCourses();

  return (
    <div className="container mx-auto px-6 py-16">
      <h1 className="text-4xl text-center font-bold text-primary mb-12">Nuestros Cursos</h1>
      {courses.length === 0 ? (
        <p className="text-center text-text-secondary">Muy pronto anunciaremos nuevos cursos.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => (
            <div key={course.id} className="bg-surface rounded-lg shadow-lg flex flex-col justify-between border border-transparent hover:border-primary transition-all overflow-hidden">
              {course.imageUrl && (
                <div className="relative w-full aspect-video bg-background">
                  <Image
                    src={course.imageUrl}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-2">{course.title}</h2>
                  <p className="text-text-secondary mb-4">{course.description}</p>
                </div>
                <div className="mt-auto">
                  {course.price && course.price > 0 && (
                    <p className="text-2xl font-bold text-primary mb-4 text-center">
                      ${course.price} MXN
                    </p>
                  )}
                  <Link href={`/cursos/${course.id}`}>
                    <span className="bg-primary text-background font-bold py-2 px-4 rounded-full text-center hover:opacity-90 w-full inline-block">
                      Ver Contenido
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

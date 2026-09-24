import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CourseDetailClient from './CourseDetailClient';
import CourseShowcase from './Showcase';

// Refresca el contenido del curso (título, descripción, precio) cada minuto sin necesitar un nuevo despliegue
export const revalidate = 60;

interface CourseDetails {
  title: string;
  description: string;
  price?: number;
  imageUrl?: string;
  published?: boolean;
  resultadosImages?: string[];
  testimoniosImages?: string[];
  alumnasImages?: string[];
  previewLesson?: {
    title: string;
    videoUrl?: string | null;
    textContent?: string | null;
  } | null;
}

async function getCourse(courseId: string): Promise<CourseDetails | null> {
  const courseSnap = await getDoc(doc(db, 'courses', courseId));
  if (!courseSnap.exists()) return null;
  return courseSnap.data() as CourseDetails;
}

export async function generateMetadata({ params }: { params: { courseId: string } }): Promise<Metadata> {
  const course = await getCourse(params.courseId);
  if (!course) {
    return { title: 'Curso no encontrado' };
  }
  const isHidden = course.published === false;
  return {
    title: course.title,
    description: course.description?.slice(0, 160),
    alternates: { canonical: `/cursos/${params.courseId}` },
    robots: isHidden ? { index: false, follow: false } : undefined,
    openGraph: course.imageUrl ? { images: [{ url: course.imageUrl }] } : undefined,
  };
}

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const course = await getCourse(params.courseId);
  if (!course) {
    notFound();
  }

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'Bere Cárdenas Cosmetología Integral',
      sameAs: 'https://berecardenascosmetologia.com.mx',
    },
    ...(course.price ? {
      offers: {
        '@type': 'Offer',
        price: course.price,
        priceCurrency: 'MXN',
        url: `https://berecardenascosmetologia.com.mx/cursos/${params.courseId}`,
      },
    } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <CourseDetailClient courseId={params.courseId} course={course} />
      <CourseShowcase
        resultados={course.resultadosImages || []}
        testimonios={course.testimoniosImages || []}
        alumnas={course.alumnasImages || []}
      />
    </>
  );
}

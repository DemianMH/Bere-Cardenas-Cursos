import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crear Cuenta',
  description: 'Regístrate para inscribirte en los cursos de cosmetología y cosmiatría de Bere Cárdenas.',
  alternates: { canonical: '/registro' },
  robots: { index: false, follow: true },
};

export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return children;
}

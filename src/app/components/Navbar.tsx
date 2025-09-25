"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const { user } = useAuth(); // 'user' ahora puede contener el 'rol'
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirige al inicio después de cerrar sesión
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <header className="bg-background shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/">
          <Image 
            src="/logo_color.png" 
            alt="Bere Cárdenas Logo" 
            width={200} 
            height={50} 
            priority 
          />
        </Link>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-primary-dark hover:text-primary-medium transition-colors">Inicio</Link>
          <Link href="/cursos" className="text-primary-dark hover:text-primary-medium transition-colors">Cursos</Link>
          {user && (
            <Link href="/mis-cursos" className="text-primary-dark hover:text-primary-medium transition-colors">Mis Cursos</Link>
          )}
          {/* --- ENLACES EXCLUSIVOS PARA DOCENTES --- */}
          {user && user.rol === 'docente' && (
            <>
              <Link href="/admin/cursos" className="font-bold text-primary-medium hover:text-primary-dark transition-colors">
                Gestionar Cursos
              </Link>
              <Link href="/admin/preguntas" className="font-bold text-primary-medium hover:text-primary-dark transition-colors">
                Ver Preguntas
              </Link>
            </>
          )}
          <Link href="/acerca-de" className="text-primary-dark hover:text-primary-medium transition-colors">Acerca de Nosotros</Link>
          <Link href="/contacto" className="text-primary-dark hover:text-primary-medium transition-colors">Contacto</Link>
        </div>
        <div>
          {/* Lógica para mostrar botones de Iniciar/Cerrar Sesión */}
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-primary-dark text-white py-2 px-4 rounded-full hover:bg-opacity-80 transition-colors"
            >
              Cerrar Sesión
            </button>
          ) : (
            <Link href="/login" className="bg-primary-medium text-white py-2 px-4 rounded-full hover:bg-primary-dark transition-colors">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
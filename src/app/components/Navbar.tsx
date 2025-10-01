// RUTA: src/app/components/Navbar.tsx

"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <header className="bg-surface shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/">
          <Image 
            src="/logo_blanco.png"
            alt="Bere Cárdenas Logo" 
            width={200} 
            height={50} 
            priority 
          />
        </Link>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-text-secondary hover:text-primary transition-colors">Inicio</Link>
          <Link href="/cursos" className="text-text-secondary hover:text-primary transition-colors">Cursos</Link>
          {user && (
            <Link href="/mis-cursos" className="text-text-secondary hover:text-primary transition-colors">Mis Cursos</Link>
          )}
          {user && user.rol === 'docente' && (
            <>
              <Link href="/admin/cursos" className="font-bold text-primary hover:text-text-primary transition-colors">
                Cursos
              </Link>
               {/* --- NUEVO ENLACE --- */}
              <Link href="/admin/alumnos" className="font-bold text-primary hover:text-text-primary transition-colors">
                Alumnos
              </Link>
              <Link href="/admin/solicitudes" className="font-bold text-primary hover:text-text-primary transition-colors">
                Solicitudes
              </Link>
              <Link href="/admin/preguntas" className="font-bold text-primary hover:text-text-primary transition-colors">
                Preguntas
              </Link>
            </>
          )}
          <Link href="/acerca-de" className="text-text-secondary hover:text-primary transition-colors">Acerca de</Link>
          <Link href="/contacto" className="text-text-secondary hover:text-primary transition-colors">Contacto</Link>
        </div>
        <div>
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-surface text-text-primary border border-primary py-2 px-4 rounded-full hover:bg-primary hover:text-background transition-colors"
            >
              Cerrar Sesión
            </button>
          ) : (
            <Link href="/login" className="bg-primary text-background font-bold py-2 px-4 rounded-full hover:opacity-90 transition-opacity">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
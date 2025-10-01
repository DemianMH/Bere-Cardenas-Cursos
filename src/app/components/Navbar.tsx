// RUTA: src/app/components/Navbar.tsx

"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';

const Navbar = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [navIsOpen, setNavIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const NavLinks = () => (
    <>
      <Link href="/" className="py-2 text-text-secondary hover:text-primary transition-colors" onClick={() => setNavIsOpen(false)}>Inicio</Link>
      <Link href="/cursos" className="py-2 text-text-secondary hover:text-primary transition-colors" onClick={() => setNavIsOpen(false)}>Cursos</Link>
      {user && (
        <Link href="/mis-cursos" className="py-2 text-text-secondary hover:text-primary transition-colors" onClick={() => setNavIsOpen(false)}>Mis Cursos</Link>
      )}
      {user && user.rol === 'docente' && (
        <>
          <Link href="/admin/cursos" className="py-2 font-bold text-primary hover:text-text-primary transition-colors" onClick={() => setNavIsOpen(false)}>
            Cursos
          </Link>
          <Link href="/admin/alumnos" className="py-2 font-bold text-primary hover:text-text-primary transition-colors" onClick={() => setNavIsOpen(false)}>
            Alumnos
          </Link>
          <Link href="/admin/solicitudes" className="py-2 font-bold text-primary hover:text-text-primary transition-colors" onClick={() => setNavIsOpen(false)}>
            Solicitudes
          </Link>
          <Link href="/admin/preguntas" className="py-2 font-bold text-primary hover:text-text-primary transition-colors" onClick={() => setNavIsOpen(false)}>
            Preguntas
          </Link>
        </>
      )}
      <Link href="/acerca-de" className="py-2 text-text-secondary hover:text-primary transition-colors" onClick={() => setNavIsOpen(false)}>Acerca de</Link>
      <Link href="/contacto" className="py-2 text-text-secondary hover:text-primary transition-colors" onClick={() => setNavIsOpen(false)}>Contacto</Link>
    </>
  );

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
        {/* Links para Desktop */}
        <div className="hidden md:flex items-center space-x-6">
          <NavLinks />
        </div>

        {/* Botones de Sesión */}
        <div className="hidden md:block">
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

        {/* Botón de Menú Móvil */}
        <div className="md:hidden">
          <button onClick={() => setNavIsOpen(!navIsOpen)}>
            {navIsOpen ? <AiOutlineClose size={25} /> : <AiOutlineMenu size={25} />}
          </button>
        </div>
      </nav>

      {/* Panel de Menú Móvil */}
      {navIsOpen && (
        <div className="md:hidden bg-surface absolute w-full left-0">
          <div className="px-6 pt-2 pb-6 flex flex-col items-center space-y-4">
            <NavLinks />
            <div className="mt-4">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="bg-surface text-text-primary border border-primary py-2 px-4 rounded-full hover:bg-primary hover:text-background transition-colors"
                >
                  Cerrar Sesión
                </button>
              ) : (
                <Link href="/login" onClick={() => setNavIsOpen(false)} className="bg-primary text-background font-bold py-2 px-4 rounded-full hover:opacity-90 transition-opacity">
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
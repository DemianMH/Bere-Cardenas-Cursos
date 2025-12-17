"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react'; // Importar useEffect y useRef
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';

const Navbar = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [navIsOpen, setNavIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null); // Ref para el menú móvil

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setNavIsOpen(false); // Cerrar menú al cerrar sesión
      router.push('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Cerrar menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setNavIsOpen(false);
      }
    };
    if (navIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navIsOpen]);


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
          <Link href="/admin/cupones" className="py-2 font-bold text-primary hover:text-text-primary transition-colors" onClick={() => setNavIsOpen(false)}>
            Cupones
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
        <div className="hidden md:flex items-center space-x-6">
          <NavLinks />
        </div>

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

        {/* Botón de Menú Móvil - Asegúrate que esté dentro del nav para el ref */}
         <div ref={navRef} className="md:hidden">
            <button onClick={() => setNavIsOpen(!navIsOpen)} aria-label="Abrir menú">
              {navIsOpen ? <AiOutlineClose size={25} className="text-text-primary" /> : <AiOutlineMenu size={25} className="text-text-primary" />}
            </button>

            {/* Panel de Menú Móvil */}
            {navIsOpen && (
            <div className="bg-surface absolute top-full right-0 w-64 border-l border-t border-primary/20 shadow-xl rounded-bl-lg">
                <div className="px-6 pt-4 pb-6 flex flex-col items-start space-y-3">
                <NavLinks />
                <div className="mt-4 w-full">
                    {user ? (
                    <button
                        onClick={handleLogout} // Llama a handleLogout que ya cierra el menú
                        className="w-full text-left bg-surface text-text-primary border border-primary py-2 px-4 rounded-full hover:bg-primary hover:text-background transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                    ) : (
                    <Link href="/login" onClick={() => setNavIsOpen(false)} className="block w-full text-center bg-primary text-background font-bold py-2 px-4 rounded-full hover:opacity-90 transition-opacity">
                        Iniciar Sesión
                    </Link>
                    )}
                </div>
                </div>
            </div>
            )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
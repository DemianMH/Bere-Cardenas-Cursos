// RUTA: src/app/admin/layout.tsx

"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si ya terminó de cargar y (no hay usuario o el usuario no es docente), redirige.
    if (!loading && (!user || user.rol !== 'docente')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Muestra un mensaje de carga mientras se verifica la sesión.
  if (loading) {
    return <p className="text-center mt-12 text-text-secondary">Verificando acceso...</p>;
  }

  // Si ya cargó y el usuario es docente, muestra el contenido del panel.
  if (user && user.rol === 'docente') {
    return <>{children}</>;
  }
  
  // Muestra esto mientras redirige para evitar errores.
  return <p className="text-center mt-12 text-text-secondary">Acceso denegado. Redirigiendo...</p>;
}
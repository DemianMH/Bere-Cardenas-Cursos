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
    // Si la autenticación ha terminado y el usuario no existe o no es 'docente'
    if (!loading && (!user || user.rol !== 'docente')) {
      // Lo redirigimos a la página principal
      router.push('/'); 
    }
  }, [user, loading, router]);

  // Mientras se verifica, muestra un mensaje de carga
  if (loading || !user || user.rol !== 'docente') {
    return <p className="text-center mt-12 text-text-secondary">Verificando acceso de administrador...</p>;
  }

  // Si la verificación es exitosa, muestra el contenido de la página de admin
  return <>{children}</>;
}
// src/app/admin/layout.tsx
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
    // Si la carga ha terminado y no hay usuario o el rol no es 'docente'
    if (!loading && (!user || user.rol !== 'docente')) {
      router.push('/'); // Redirige al inicio
    }
  }, [user, loading, router]);

  // Mientras se verifica el usuario, no mostrar nada para evitar parpadeos
  if (loading || !user || user.rol !== 'docente') {
    return <p className="text-center mt-12">Verificando acceso...</p>;
  }

  // Si el usuario es un docente, muestra el contenido de la página de admin
  return <>{children}</>;
}
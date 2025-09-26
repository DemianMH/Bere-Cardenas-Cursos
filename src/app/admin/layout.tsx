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
    if (!loading && (!user || user.rol !== 'docente')) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || user.rol !== 'docente') {
    return <p className="text-center mt-12 text-text-secondary">Verificando acceso de administrador...</p>;
  }

  return <>{children}</>;
}
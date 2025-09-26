import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { AuthProvider } from "@/context/AuthContext";

// Configura la fuente Montserrat para usarla en todo el sitio
const montserrat = Montserrat({
  variable: "--font-montserrat", // Nombre de variable más claro
  subsets: ["latin"],
});

// Define los metadatos para el SEO (Google, etc.)
export const metadata: Metadata = {
  title: "Bere Cárdenas - Cosmetología Integral",
  description: "Formando especialistas capaces de transformar vidas a través de tratamientos estéticos respaldados por conocimiento, responsabilidad y pasión por el cuidado integral.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} font-sans`}>
        {/* AuthProvider envuelve toda la aplicación para gestionar la sesión del usuario */}
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">
            {/* Aquí se renderiza el contenido de cada página */}
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
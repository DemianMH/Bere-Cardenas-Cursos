// src/app/layout.tsx

import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css"; //
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
// 1. Importa el AuthProvider
import { AuthProvider } from "@/context/AuthContext";

const montserrat = Montserrat({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
        {/* 2. Envuelve todo con AuthProvider */}
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
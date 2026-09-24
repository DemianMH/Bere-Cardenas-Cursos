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

const siteUrl = "https://berecardenascosmetologia.com.mx";
const siteName = "Bere Cárdenas - Cosmetología Integral";
const siteDescription = "Cursos y diplomados de cosmetología, cosmiatría y estética profesional impartidos por Bere Cárdenas: protocolos seguros, tecnología avanzada y respaldo legal para especialistas de la belleza en México.";

// Define los metadatos para el SEO (Google, etc.)
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "cursos de cosmetología",
    "cosmiatría",
    "diplomado estética profesional",
    "Bere Cárdenas",
    "capacitación en belleza México",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDescription,
    images: [{ url: "/berenice.jpg", width: 1200, height: 1200, alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/berenice.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Bere Cárdenas Cosmetología Integral",
    url: siteUrl,
    logo: `${siteUrl}/logo_color.png`,
    description: siteDescription,
    sameAs: [
      "https://www.facebook.com/BereCardenasCosmetologiaIntegral",
      "https://www.instagram.com/bere.cardenas_cosmetologia",
      "https://www.tiktok.com/@Bere.cardenas.cosme",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+52-33-1694-2473",
      contactType: "customer service",
      areaServed: "MX",
      availableLanguage: "Spanish",
    },
  };

  return (
    <html lang="es">
      <body className={`${montserrat.variable} font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
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
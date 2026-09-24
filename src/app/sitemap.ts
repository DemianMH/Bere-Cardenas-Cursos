import { MetadataRoute } from "next";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const siteUrl = "https://berecardenascosmetologia.com.mx";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/cursos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/acerca-de`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contacto`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/registro`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terminos-y-condiciones`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${siteUrl}/aviso-de-privacidad`, changeFrequency: "yearly", priority: 0.1 },
  ];

  try {
    const snapshot = await getDocs(collection(db, "courses"));
    const courseRoutes: MetadataRoute.Sitemap = snapshot.docs
      .filter((doc) => doc.data().published !== false)
      .map((doc) => ({
        url: `${siteUrl}/cursos/${doc.id}`,
        changeFrequency: "monthly",
        priority: 0.8,
      }));
    return [...staticRoutes, ...courseRoutes];
  } catch (error) {
    console.error("No se pudo generar el sitemap dinámico de cursos:", error);
    return staticRoutes;
  }
}

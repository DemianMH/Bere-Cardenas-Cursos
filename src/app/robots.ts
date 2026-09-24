import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/admin-setup", "/mis-cursos"],
      },
    ],
    sitemap: "https://berecardenascosmetologia.com.mx/sitemap.xml",
  };
}

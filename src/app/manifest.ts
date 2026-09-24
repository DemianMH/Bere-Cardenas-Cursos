import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bere Cárdenas - Cosmetología Integral",
    short_name: "Bere Cárdenas",
    description: "Cursos y diplomados de cosmetología, cosmiatría y estética profesional.",
    start_url: "/",
    display: "standalone",
    background_color: "#121212",
    theme_color: "#121212",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}

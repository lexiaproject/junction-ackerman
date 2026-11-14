import type { MetadataRoute } from "next";

// Permite "instalar" la app en el móvil (Añadir a pantalla de inicio). Abre la app de la persona.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relevo · recovery that passes forward",
    short_name: "Relevo",
    description: "A chain of TMS patients: each person is accompanied by someone a few months ahead.",
    start_url: "/relevo/app",
    display: "standalone",
    background_color: "#f5f6f3",
    theme_color: "#0e6b5c",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}

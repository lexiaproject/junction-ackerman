import type { MetadataRoute } from "next";

// Permite "instalar" la app en el móvil (Añadir a pantalla de inicio). Abre la app de la persona.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relay: peer support after TMS",
    short_name: "Relay",
    description: "Every patient who gets better becomes the support for the next one.",
    start_url: "/app",
    display: "standalone",
    background_color: "#eef0eb",
    theme_color: "#1e3b35",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}

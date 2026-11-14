import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // La dirección principal lleva a Relevo. Relay (prototipo viejo) se queda aparte, sin borrar.
  async redirects() {
    return [{ source: "/", destination: "/relevo", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

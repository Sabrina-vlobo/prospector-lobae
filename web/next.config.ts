import type { NextConfig } from "next";

// O front nunca fala direto com Google/Anthropic nem com o banco:
// tudo passa pela API. Em dev, o próprio Next repassa /api/* pra ela,
// então o navegador só enxerga UMA origem (localhost:3000) e não precisa de CORS.
const API_URL = process.env.API_URL ?? "http://localhost:3333";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;

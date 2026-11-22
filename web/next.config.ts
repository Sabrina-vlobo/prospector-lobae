import type { NextConfig } from "next";

// O front nunca fala direto com Google/Anthropic nem com o banco:
// tudo passa pela API. Em dev, o próprio Next repassa /api/* pra ela,
// então o navegador só enxerga UMA origem (localhost:3000) e não precisa de CORS.
const API_URL = process.env.API_URL ?? "http://localhost:3333";

const nextConfig: NextConfig = {
  // Pasta de build configurável: permite rodar uma 2ª instância (ex: a de demo,
  // com outro banco) ao mesmo tempo que o npm run dev normal, sem uma brigar com a outra.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;

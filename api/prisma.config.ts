import "dotenv/config";
import { defineConfig } from "prisma/config";

// O Prisma 7 não lê mais o .env sozinho nem guarda a URL no schema:
// a configuração da CLI (migrate, seed, studio) fica aqui.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `generate` não precisa de banco, então não exigimos a variável aqui:
    // quem precisa dela (migrate/seed) falha com uma mensagem clara do Prisma.
    url: process.env.DATABASE_URL ?? "",
  },
});

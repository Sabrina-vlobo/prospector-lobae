import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../env.js";

// Prisma 7 conversa com o Postgres através de um "driver adapter" (aqui, o `pg`).
// Exportamos UMA instância pra API inteira reaproveitar o pool de conexões.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

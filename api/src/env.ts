import { z } from "zod";

// Valida as variáveis de ambiente UMA vez, na subida.
// Se faltar algo, a API nem sobe — melhor que quebrar no meio de uma requisição.
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL não definida — copie api/.env.example para api/.env"),
  // API_PORT (e não PORT): muita ferramenta define PORT no ambiente e a API roubaria a porta do Next.
  API_PORT: z.coerce.number().int().positive().default(3333),
  // Opcionais até as fases que usam (1 e 3). String vazia vira undefined.
  GOOGLE_PLACES_API_KEY: z.string().optional().transform((v) => v || undefined),
  ANTHROPIC_API_KEY: z.string().optional().transform((v) => v || undefined),
});

export const env = EnvSchema.parse(process.env);

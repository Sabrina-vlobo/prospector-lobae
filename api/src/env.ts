import { z } from "zod";

// Valida as variáveis de ambiente UMA vez, na subida.
// Se faltar algo, a API nem sobe — melhor que quebrar no meio de uma requisição.
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL não definida — copie api/.env.example para api/.env"),
  // API_PORT (e não PORT): muita ferramenta define PORT no ambiente e a API roubaria a porta do Next.
  API_PORT: z.coerce.number().int().positive().default(3333),

  // ---------- Google Places ----------
  // Opcional na subida (a tela avisa se faltar). String vazia vira undefined.
  GOOGLE_PLACES_API_KEY: z.string().optional().transform((v) => v || undefined),
  // Freio de gastos: no máximo N chamadas pagas ao Google por mês (contadas no banco).
  GOOGLE_MONTHLY_CALL_LIMIT: z.coerce.number().int().min(0).default(200),
  // Cada página = 1 chamada = até 20 negócios. O Google entrega no máximo 3 páginas.
  GOOGLE_MAX_PAGES_PER_SEARCH: z.coerce.number().int().min(1).max(3).default(3),

  // ---------- Claude (Fase 3) ----------
  ANTHROPIC_API_KEY: z.string().optional().transform((v) => v || undefined),
  // Modelo configurável. Padrão: o mais barato (Haiku).
  ANTHROPIC_MODEL: z.string().min(1).default("claude-haiku-5-5"),
});

export const env = EnvSchema.parse(process.env);

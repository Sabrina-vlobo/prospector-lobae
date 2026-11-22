import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "../env.js";
import { HttpError } from "./errors.js";
import { QualificationSchema, SYSTEM_PROMPT } from "./qualifyPrompt.js";

// Um cliente só pra API toda (reaproveita conexões). Criado na 1ª chamada,
// assim a API sobe normalmente mesmo sem a chave preenchida.
let client: Anthropic | null = null;

/**
 * Confere se dá pra chamar o Claude. Quem usa chama isso ANTES de reservar cota:
 * sem chave, não faz sentido gastar uma "vaga" do limite mensal.
 */
export function ensureClaudeConfigured(): void {
  if (!env.ANTHROPIC_API_KEY) {
    throw new HttpError(
      503,
      "Falta a ANTHROPIC_API_KEY no api/.env. Coloque a chave e reinicie o npm run dev.",
      "MISSING_ANTHROPIC_KEY",
    );
  }
}

function getClient(): Anthropic {
  ensureClaudeConfigured();
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Pede a qualificação ao Claude e devolve o JSON "cru" que ele respondeu.
 * Quem chama ainda valida com zod antes de salvar (ver services/qualify.ts).
 */
export async function askClaudeForQualification(userPrompt: string): Promise<unknown> {
  const anthropic = getClient();

  let response;
  try {
    response = await anthropic.messages.parse({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        // Tarefa simples: esforço baixo = menos tokens = mais barato.
        effort: "low",
        // Structured outputs: a API só deixa o modelo responder nesse formato JSON.
        format: zodOutputFormat(QualificationSchema),
      },
    });
  } catch (error) {
    // Erros da API viram mensagens legíveis pra tela (sem vazar detalhes internos).
    if (error instanceof Anthropic.AuthenticationError) {
      throw new HttpError(502, "A chave da Anthropic foi recusada. Confira a ANTHROPIC_API_KEY.", "ANTHROPIC_AUTH");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, "A API do Claude pediu pra esperar um pouco. Tente de novo em instantes.", "ANTHROPIC_RATE_LIMIT");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[claude] ${error.status}: ${error.message}`);
      throw new HttpError(502, `A API do Claude falhou (HTTP ${error.status ?? "?"}).`, "ANTHROPIC_ERROR");
    }
    // O SDK confere o JSON com o schema; se não bater, cai aqui.
    console.error("[claude] resposta fora do formato", error);
    throw new HttpError(502, "A IA respondeu fora do formato esperado. Tente qualificar de novo.", "AI_BAD_OUTPUT");
  }

  if (response.stop_reason === "refusal") {
    throw new HttpError(502, "A IA recusou qualificar esse negócio.", "AI_REFUSAL");
  }
  if (response.stop_reason === "max_tokens") {
    throw new HttpError(502, "A resposta da IA veio cortada. Tente de novo.", "AI_TRUNCATED");
  }

  return response.parsed_output;
}

import { env } from "../env.js";
import type { Lead } from "../generated/prisma/client.js";
import { askClaudeForQualification, ensureClaudeConfigured } from "../lib/claude.js";
import { HttpError } from "../lib/errors.js";
import { getPlaceReviews, type Review } from "../lib/googlePlaces.js";
import { prisma } from "../lib/prisma.js";
import { buildUserPrompt, ensureSignatureAndClosing, QualificationSchema } from "../lib/qualifyPrompt.js";
import { ANTHROPIC, GOOGLE_PLACE_DETAILS, reserveCall } from "../lib/quota.js";

/** Lead de demo (seed) não existe no Google: não dá pra buscar avaliações dele. */
const isDemoLead = (lead: Lead) => lead.placeId.startsWith("demo-");

async function fetchReviews(lead: Lead): Promise<Review[]> {
  // Sem avaliações no Google (ou lead fictício)? Não gasta chamada.
  if (!lead.reviewsCount || isDemoLead(lead)) return [];

  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new HttpError(503, "Falta a GOOGLE_PLACES_API_KEY no api/.env.", "MISSING_GOOGLE_KEY");
  }
  await reserveCall(GOOGLE_PLACE_DETAILS, env.GOOGLE_DETAILS_MONTHLY_LIMIT);
  return getPlaceReviews({ apiKey, placeId: lead.placeId });
}

/** Qualifica UM lead: avaliações → Claude → validação → salva. Devolve o lead atualizado. */
export async function qualifyLead(id: string): Promise<Lead> {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new HttpError(404, "Lead não encontrado", "LEAD_NOT_FOUND");

  // Sem chave da IA, para aqui: nem busca avaliações (que custam) nem reserva cota.
  ensureClaudeConfigured();

  const reviews = await fetchReviews(lead);
  const userPrompt = buildUserPrompt(lead, reviews);

  await reserveCall(ANTHROPIC, env.ANTHROPIC_MONTHLY_CALL_LIMIT);
  const raw = await askClaudeForQualification(userPrompt);

  // A IA não é um contrato: conferimos o formato ANTES de encostar no banco.
  const parsed = QualificationSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[qualify] saída inválida da IA", parsed.error.issues);
    throw new HttpError(502, "A IA respondeu fora do formato esperado. Tente qualificar de novo.", "AI_BAD_OUTPUT");
  }

  const { score, scoreReason, hook, message } = parsed.data;

  return prisma.lead.update({
    where: { id },
    data: { score, scoreReason, hook, message: ensureSignatureAndClosing(message) },
  });
}

export type QualifyResult =
  | { id: string; ok: true; lead: Lead }
  | { id: string; ok: false; error: string; code?: string };

/**
 * Qualifica vários, UM DE CADA VEZ (sem disparar tudo junto):
 * fica mais fácil de acompanhar e respeita a cota com folga.
 * Se um falhar, os outros continuam; se a cota acabar, para na hora.
 */
export async function qualifyMany(ids: string[]): Promise<QualifyResult[]> {
  const results: QualifyResult[] = [];

  for (const [index, id] of ids.entries()) {
    try {
      results.push({ id, ok: true, lead: await qualifyLead(id) });
    } catch (error) {
      const http = error instanceof HttpError ? error : null;
      if (!http) console.error(error);
      results.push({ id, ok: false, error: http?.message ?? "Erro interno", code: http?.code });

      // Cota esgotada ou chave faltando: não adianta tentar os próximos.
      if (http && ["QUOTA_EXCEEDED", "MISSING_ANTHROPIC_KEY", "MISSING_GOOGLE_KEY", "ANTHROPIC_AUTH"].includes(http.code ?? "")) {
        for (const skipped of ids.slice(index + 1)) {
          results.push({ id: skipped, ok: false, error: "Não processado: " + http.message, code: http.code });
        }
        break;
      }
    }
  }

  return results;
}

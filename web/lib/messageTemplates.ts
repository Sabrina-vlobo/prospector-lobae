import type { Lead } from "./types";

// Mensagens montadas SÓ com os dados que já temos do Google: custo zero, sem IA.
// Cada modelo é uma função pura (lead → texto), fácil de testar e de ajustar.

export const SIGNATURE = "Sabrina, da LOBAE";
export const OPT_OUT_LINE = "Se não fizer sentido, é só me avisar que não mando mais.";

export type TemplateId = "direta" | "elogio" | "curta" | "salva";

export type MessageOption = { id: TemplateId; label: string; text: string };

type LeadForMessage = Pick<
  Lead,
  "name" | "category" | "city" | "rating" | "reviewsCount" | "websiteType" | "website" | "message"
> &
  Partial<Pick<Lead, "contactedAt">>;

// ---------- pedacinhos reaproveitados ----------

/** "4,8" (vírgula, como no Brasil) */
const formatRating = (rating: number) => rating.toFixed(1).replace(".", ",");

/** Nome da rede pelo link: instagram.com → "Instagram". */
export function socialNetworkName(website: string | null): string | null {
  if (!website) return null;
  const url = website.toLowerCase();
  if (url.includes("instagram")) return "Instagram";
  if (url.includes("facebook") || url.includes("fb.")) return "Facebook";
  if (url.includes("linktr.ee")) return "Linktree";
  if (url.includes("wa.me") || url.includes("whatsapp")) return "WhatsApp";
  if (url.includes("ifood")) return "iFood";
  if (url.includes("tiktok")) return "TikTok";
  return null;
}

/** "vocês ainda não têm site" / "hoje vocês estão só no Instagram" */
function presencePhrase(lead: LeadForMessage): string {
  if (lead.websiteType === "social") {
    const network = socialNetworkName(lead.website);
    return network ? `hoje vocês estão só no ${network}` : "hoje vocês estão só nas redes sociais";
  }
  if (lead.websiteType === "real") return "vocês já têm um site";
  return "vocês ainda não têm um site";
}

/** "nota 4,8 com 212 avaliações" — só quando os números ajudam a elogiar */
function ratingPhrase(lead: LeadForMessage): string | null {
  if (lead.rating == null || lead.rating < 4) return null;
  if (lead.reviewsCount && lead.reviewsCount >= 10) {
    return `nota ${formatRating(lead.rating)} com ${lead.reviewsCount} avaliações`;
  }
  return `nota ${formatRating(lead.rating)}`;
}

/** O que um site resolveria, de acordo com a presença atual */
function benefitPhrase(lead: LeadForMessage): string {
  if (lead.websiteType === "social") {
    return "um site simples que junta tudo num lugar só, aparece melhor no Google e não depende só das redes";
  }
  return "um site simples pra quem procura no Google achar endereço, horário e falar com vocês num clique";
}

function withSignature(body: string): string {
  return `${body}\n\n${SIGNATURE}\n${OPT_OUT_LINE}`;
}

// ---------- os 3 modelos ----------

/** 1. Direta: elogio rápido + o que você faz + pergunta. */
function direta(lead: LeadForMessage): string {
  const rating = ratingPhrase(lead);
  const intro = rating
    ? `Oi! Tudo bem? Vi a ${lead.name} no Google, ${rating}, parabéns!`
    : `Oi! Tudo bem? Vi a ${lead.name} no Google.`;
  return withSignature(
    `${intro} Reparei que ${presencePhrase(lead)}. Eu crio ${benefitPhrase(lead)}. Posso te mandar uma ideia de como ficaria pra vocês?`,
  );
}

/** 2. Elogio + pergunta: puxa conversa antes de oferecer. */
function elogio(lead: LeadForMessage): string {
  const where = lead.category && lead.city ? `procurando ${lead.category} em ${lead.city}` : "pesquisando no Google";
  const praise =
    lead.rating != null && lead.rating >= 4.5 ? "e as avaliações de vocês são ótimas!" : "e gostei bastante do trabalho de vocês!";
  return withSignature(
    `Oi, tudo bem? Achei a ${lead.name} ${where} ${praise} Fiquei curiosa: hoje os clientes chegam mais pelo boca a boca ou pela internet? Pergunto porque eu faço sites pra pequenos negócios e acho que daria pra vocês aparecerem pra muito mais gente.`,
  );
}

/** 3. Curta: pra quem não gosta de textão. */
function curta(lead: LeadForMessage): string {
  return withSignature(
    `Oi, pessoal da ${lead.name}! Faço sites pra pequenos negócios e vi que ${presencePhrase(lead)}. Topam ver um exemplo rápido, sem compromisso?`,
  );
}

/**
 * Todas as opções pra esse lead. Se ele já tem uma mensagem salva, ela entra como 4ª:
 * "Última enviada" (se você já contatou) ou "Sugestão da IA" (se foi qualificado).
 */
export function buildMessageOptions(lead: LeadForMessage): MessageOption[] {
  const options: MessageOption[] = [
    { id: "direta", label: "Direta", text: direta(lead) },
    { id: "elogio", label: "Elogio + pergunta", text: elogio(lead) },
    { id: "curta", label: "Curta", text: curta(lead) },
  ];
  if (lead.message) {
    options.push({
      id: "salva",
      label: lead.contactedAt ? "Última enviada" : "Sugestão da IA",
      text: lead.message,
    });
  }
  return options;
}

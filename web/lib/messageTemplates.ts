import type { Lead } from "./types";

// Mensagens montadas SÓ com os dados que já temos do Google: custo zero, sem IA.
// Cada modelo é uma função pura (lead → texto), fácil de testar e de ajustar.

export const SIGNATURE = "Sabrina, da LOBAE";
/** Frase final: convida a pessoa a chamar quando quiser (sem pressão). */
export const CLOSING_LINE = "Qualquer coisa, é só me chamar por aqui.";

export type TemplateId =
  | "direta"
  | "elogio"
  | "curta"
  | "salva"
  | "followup-leve"
  | "followup-pergunta"
  | "followup-final";

export type MessageOption = {
  id: TemplateId;
  label: string;
  text: string;
  /** false = depois de enviar, não agenda outro follow-up (padrão: agenda em 3 dias) */
  scheduleFollowup?: boolean;
};

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
  return `${body}\n\n${SIGNATURE}\n${CLOSING_LINE}`;
}

// ---------- primeiro contato ----------
// Regra: terminar com uma PERGUNTA ABERTA, sem oferecer demo, exemplo ou "ideia de como ficaria".
// Quem responde "sim" puxa a conversa; aí você explica do seu jeito.

/** 1. Direta: elogio rápido + o que você faz + pergunta se faz sentido. */
function direta(lead: LeadForMessage): string {
  const rating = ratingPhrase(lead);
  const intro = rating
    ? `Oi! Tudo bem? Vi a ${lead.name} no Google, ${rating}, parabéns!`
    : `Oi! Tudo bem? Vi a ${lead.name} no Google.`;
  return withSignature(
    `${intro} Reparei que ${presencePhrase(lead)}. Eu crio ${benefitPhrase(lead)}. Ter um site é algo que faz sentido pra vocês hoje?`,
  );
}

/** 2. Elogio + pergunta: puxa conversa antes de falar de site. */
function elogio(lead: LeadForMessage): string {
  const where = lead.category && lead.city ? `procurando ${lead.category} em ${lead.city}` : "pesquisando no Google";
  const praise =
    lead.rating != null && lead.rating >= 4.5 ? "e as avaliações de vocês são ótimas!" : "e gostei bastante do trabalho de vocês!";
  return withSignature(
    `Oi, tudo bem? Achei a ${lead.name} ${where} ${praise} Fiquei curiosa: hoje os clientes chegam mais pelo boca a boca ou pela internet? Pergunto porque eu faço sites pra pequenos negócios e acho que vocês poderiam aparecer pra muito mais gente.`,
  );
}

/** 3. Curta: pra quem não gosta de textão. */
function curta(lead: LeadForMessage): string {
  return withSignature(
    `Oi, pessoal da ${lead.name}! Faço sites pra pequenos negócios e vi que ${presencePhrase(lead)}. Já pensaram em ter um? Se tiverem interesse, te explico rapidinho como funciona.`,
  );
}

// ---------- follow-up (status ENVIADO, sem resposta) ----------

/** Leve: só confirma se a pessoa viu, sem pressão. */
function followupLeve(lead: LeadForMessage): string {
  return withSignature(
    `Oi! Passando só pra saber se você conseguiu ver minha mensagem sobre um site pra ${lead.name}. Sem pressa, tá?`,
  );
}

/** Pergunta direta: facilita o "agora não". */
function followupPergunta(lead: LeadForMessage): string {
  return withSignature(
    `Oi, tudo bem? Voltando aqui rapidinho: um site pra ${lead.name} é algo que faz sentido agora, ou é melhor eu te chamar mais pra frente?`,
  );
}

/** Último contato: encerra com elegância (e não agenda outro follow-up). */
function followupFinal(lead: LeadForMessage): string {
  return `Oi! Última mensagem, prometo. Se um dia quiserem um site pra ${lead.name}, é só me chamar aqui. Sucesso pra vocês!\n\n${SIGNATURE}`;
}

/**
 * Sugestões de follow-up pra quem está como ENVIADO.
 * `scheduleFollowup: false` no último: depois dele, não tem próximo lembrete.
 */
export function buildFollowupOptions(lead: LeadForMessage): MessageOption[] {
  return [
    { id: "followup-leve", label: "Lembrete leve", text: followupLeve(lead) },
    { id: "followup-pergunta", label: "Pergunta direta", text: followupPergunta(lead) },
    { id: "followup-final", label: "Último contato", text: followupFinal(lead), scheduleFollowup: false },
  ];
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

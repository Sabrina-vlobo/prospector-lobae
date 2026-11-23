import type { LeadStatus } from "./types";

// Como cada status aparece na tela (usado na visão geral, na tabela e no kanban).
// As cores vêm dos tokens --st-* do globals.css, que mudam no tema escuro.
export const STATUS_META: Record<LeadStatus, { label: string; hint: string; color: string }> = {
  NOVO: { label: "Novo", hint: "ainda não contatados", color: "var(--st-novo)" },
  ENVIADO: { label: "Enviado", hint: "mensagem enviada, aguardando", color: "var(--st-enviado)" },
  RESPONDEU: { label: "Respondeu", hint: "responderam a mensagem", color: "var(--st-respondeu)" },
  REUNIAO: { label: "Reunião", hint: "conversa marcada", color: "var(--st-reuniao)" },
  FECHOU: { label: "Fechou", hint: "viraram clientes", color: "var(--st-fechou)" },
  DESCARTADO: { label: "Descartado", hint: "fora do perfil", color: "var(--st-descartado)" },
};

import type { LeadStatus } from "./types";

// Como cada status aparece na tela. Fica separado do componente
// pra ser reaproveitado no kanban (Fase 5).
export const STATUS_META: Record<LeadStatus, { label: string; hint: string; color: string }> = {
  NOVO: { label: "Novo", hint: "ainda não contatados", color: "var(--mist)" },
  ENVIADO: { label: "Enviado", hint: "mensagem enviada, aguardando", color: "#8A92F5" },
  RESPONDEU: { label: "Respondeu", hint: "responderam a mensagem", color: "#5560FF" },
  REUNIAO: { label: "Reunião", hint: "conversa marcada", color: "var(--cobalt)" },
  FECHOU: { label: "Fechou", hint: "viraram clientes", color: "var(--signal)" },
  DESCARTADO: { label: "Descartado", hint: "fora do perfil", color: "#E4E6EF" },
};

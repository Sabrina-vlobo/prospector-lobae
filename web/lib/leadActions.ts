import { apiPatch, apiPost } from "./api";
import type { Lead, LeadStatus } from "./types";

/**
 * Muda o status de um lead respeitando as regras do funil:
 * - virar ENVIADO "na mão" (arrastando no kanban, por exemplo) = você mandou mensagem por fora.
 *   Então registra o contato e agenda o follow-up, igual ao botão do WhatsApp.
 * - qualquer outra mudança é um PATCH simples (a API cancela o follow-up se sair de ENVIADO).
 */
export function changeLeadStatus(lead: Pick<Lead, "id" | "status">, status: LeadStatus): Promise<Lead> {
  if (status === "ENVIADO" && lead.status !== "ENVIADO") {
    return apiPost<Lead>(`/leads/${lead.id}/contacted`, {});
  }
  return apiPatch<Lead>(`/leads/${lead.id}`, { status });
}

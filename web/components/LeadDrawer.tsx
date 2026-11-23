"use client";

import { MapPin, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { apiGet } from "@/lib/api";
import { changeLeadStatus } from "@/lib/leadActions";
import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";
import { WebsiteBadge } from "./LeadRow";
import { MessageComposer } from "./MessageComposer";
import { NotesEditor } from "./NotesEditor";
import styles from "./LeadDrawer.module.css";

type Props = {
  leadId: string | null;
  onClose: () => void;
};

/**
 * Painel lateral com tudo de um lead: status, mensagem e notas.
 * Usa o <dialog> nativo do HTML: com showModal() ele já prende o foco
 * dentro do painel e fecha com Esc, sem precisar de biblioteca.
 */
export function LeadDrawer({ leadId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();

  // Abre/fecha o <dialog> de acordo com a prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (leadId && !dialog.open) dialog.showModal();
    if (!leadId && dialog.open) dialog.close();
  }, [leadId]);

  // A chave começa com ["leads"]: qualquer mudança em leads recarrega o painel também
  const leadQuery = useQuery({
    queryKey: ["leads", "detail", leadId],
    queryFn: () => apiGet<Lead>(`/leads/${leadId}`),
    enabled: Boolean(leadId),
  });
  const lead = leadQuery.data;

  const statusChange = useMutation({
    mutationFn: (status: LeadStatus) => changeLeadStatus(lead!, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      aria-labelledby="drawer-title"
      // Esc fecha o <dialog> sozinho; aqui avisamos o pai pra limpar o estado
      onClose={onClose}
      // clique fora do painel (no fundo escurecido) também fecha
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 id="drawer-title" className={styles.title}>
              {lead?.name ?? "Carregando…"}
            </h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar painel">
            <X size={18} aria-hidden />
          </button>
        </header>

        {leadQuery.isError && (
          <p className={styles.error} role="alert">
            {leadQuery.error.message}
          </p>
        )}

        {lead && (
          <div className={styles.body}>
            <div className={styles.meta}>
              <WebsiteBadge lead={lead} />
              {lead.rating != null && (
                <span className={styles.rating}>
                  ★ {lead.rating.toFixed(1).replace(".", ",")} · {lead.reviewsCount ?? 0} aval.
                </span>
              )}
            </div>

            <label className={styles.statusField}>
              <span className="label">Status</span>
              <select
                className={styles.statusSelect}
                value={lead.status}
                disabled={statusChange.isPending}
                onChange={(e) => statusChange.mutate(e.target.value as LeadStatus)}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.contact}>
              <span>{lead.phone ?? "Sem telefone no Google"}</span>
              {lead.address && <span className={styles.muted}>{lead.address}</span>}
              {lead.mapsUrl && (
                <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className={styles.link}>
                  <MapPin size={14} aria-hidden /> Ver no Maps
                </a>
              )}
            </div>

            <section className={styles.section}>
              <MessageComposer key={lead.id + lead.status} lead={lead} />
            </section>

            <section className={styles.section}>
              <NotesEditor key={lead.id} lead={lead} />
            </section>
          </div>
        )}
      </div>
    </dialog>
  );
}

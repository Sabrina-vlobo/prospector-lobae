"use client";

import { BellRinging, ChatCircleText } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { followupLabel, shortDate } from "@/lib/dates";
import type { Lead } from "@/lib/types";
import styles from "./FollowupsToday.module.css";

export type FollowupsResponse = { items: Lead[]; total: number };

/** Mesma chave no menu (contador) e aqui: uma busca só, cache compartilhado. */
export const followupsTodayKey = ["leads", "followups", "today"] as const;

export function useFollowupsToday() {
  return useQuery({
    queryKey: followupsTodayKey,
    queryFn: () => apiGet<FollowupsResponse>("/leads/followups/today"),
    refetchInterval: 5 * 60_000, // passou da meia-noite com a aba aberta? atualiza sozinho
  });
}

export function FollowupsToday({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { data, isPending, isError, error } = useFollowupsToday();

  return (
    <section className={styles.card} aria-labelledby="followups-title">
      <div className={styles.head}>
        <h2 id="followups-title" className={styles.title}>
          <BellRinging size={18} weight="fill" className={styles.titleIcon} aria-hidden />
          Follow-ups de hoje {data && data.total > 0 && <span className={styles.badge}>{data.total}</span>}
        </h2>
      </div>

      {isPending ? (
        <p className={styles.muted}>Carregando…</p>
      ) : isError ? (
        <p className={styles.error} role="alert">
          {error.message}
        </p>
      ) : data.total === 0 ? (
        <p className={styles.muted}>Nenhum follow-up pendente. Quando alguém ficar 3 dias sem responder, aparece aqui.</p>
      ) : (
        <ul className={styles.list}>
          {data.items.map((lead) => {
            const label = lead.nextFollowupAt ? followupLabel(lead.nextFollowupAt) : "hoje";
            return (
              <li key={lead.id} className={styles.item}>
                <div className={styles.info}>
                  <span className={styles.name}>{lead.name}</span>
                  <span className={styles.sub}>
                    {lead.contactedAt && <>contatado em {shortDate(lead.contactedAt)} · </>}
                    <span className={label === "hoje" ? undefined : styles.late}>{label}</span>
                  </span>
                </div>
                <button type="button" className="btn" onClick={() => onOpenLead(lead.id)}>
                  <ChatCircleText size={16} aria-hidden />
                  Fazer follow-up
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

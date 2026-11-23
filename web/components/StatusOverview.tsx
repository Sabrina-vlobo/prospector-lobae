"use client";

import { Tray, WarningCircle } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type LeadStats } from "@/lib/types";
import styles from "./StatusOverview.module.css";

export function StatusOverview() {
  // queryKey identifica esse dado no cache. Quando um lead muda de status,
  // basta "invalidar" ["leads"] que esses números se atualizam sozinhos.
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ["leads", "stats"],
    queryFn: () => apiGet<LeadStats>("/leads/stats"),
  });

  if (isPending) return <OverviewSkeleton />;

  if (isError) {
    return (
      <div className={styles.notice} role="alert">
        <WarningCircle size={22} className={styles.noticeIcon} aria-hidden />
        <div className={styles.noticeBody}>
          <p className={styles.noticeTitle}>Não consegui buscar os números do funil.</p>
          <p className={styles.noticeText}>
            Confira se a API está rodando (<code>npm run dev</code>) e se o Docker está aberto.
          </p>
        </div>
        <button className="btn" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? "Tentando…" : "Tentar de novo"}
        </button>
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className={styles.notice}>
        <Tray size={22} className={styles.noticeIcon} aria-hidden />
        <div className={styles.noticeBody}>
          <p className={styles.noticeTitle}>Nenhum lead por aqui ainda.</p>
          <p className={styles.noticeText}>Faça uma busca abaixo pra trazer os primeiros negócios.</p>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.panel} aria-label="Leads por etapa do funil">
      <div className={styles.head}>
        <p className={styles.total}>
          <span className={styles.totalNumber}>{data.total}</span>
          <span className={styles.totalLabel}>leads no funil</span>
        </p>
      </div>

      {/* Barra empilhada: o funil inteiro numa linha, proporcional a cada status */}
      <div className={styles.funnel} aria-hidden>
        {LEAD_STATUSES.map((status) => {
          const count = data.byStatus[status];
          if (count === 0) return null;
          return (
            <span
              key={status}
              className={styles.segment}
              style={{ flexGrow: count, background: STATUS_META[status].color }}
              title={`${STATUS_META[status].label}: ${count}`}
            />
          );
        })}
      </div>

      <ul className={styles.stats}>
        {LEAD_STATUSES.map((status) => {
          const meta = STATUS_META[status];
          const count = data.byStatus[status];
          const share = Math.round((count / data.total) * 100);
          return (
            <li key={status} className={styles.stat} data-status={status} title={meta.hint}>
              <span className={styles.statLabel}>
                <span className={styles.swatch} style={{ background: meta.color }} aria-hidden />
                {meta.label}
              </span>
              <span className={styles.count}>{count}</span>
              <span className={styles.share}>{share}% do total</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className={`${styles.panel} ${styles.loading}`} aria-busy="true" aria-label="Carregando números do funil">
      <div className={`${styles.skeleton} ${styles.skeletonTotal}`} />
      <div className={`${styles.skeleton} ${styles.skeletonBar}`} />
      <div className={styles.stats}>
        {LEAD_STATUSES.map((status) => (
          <div key={status} className={`${styles.skeleton} ${styles.skeletonStat}`} />
        ))}
      </div>
    </div>
  );
}

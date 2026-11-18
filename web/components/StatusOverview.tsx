"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type LeadStats } from "@/lib/types";
import styles from "./StatusOverview.module.css";

export function StatusOverview() {
  // queryKey identifica esse dado no cache. Na Fase 4, quando um lead virar
  // ENVIADO, basta "invalidar" ["leads"] que esses números se atualizam sozinhos.
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ["leads", "stats"],
    queryFn: () => apiGet<LeadStats>("/leads/stats"),
  });

  if (isPending) return <OverviewSkeleton />;

  if (isError) {
    return (
      <div className={styles.notice} role="alert">
        <span className="tag">Sem conexão</span>
        <p className={styles.noticeTitle}>Não consegui buscar os números do funil.</p>
        <p className={styles.noticeText}>
          Confira se a API está rodando (<code>npm run dev</code> na raiz) e se o Postgres subiu (
          <code>npm run db:up</code>).
        </p>
        <button className="btn" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? "Tentando…" : "Tentar de novo"}
        </button>
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className={styles.notice}>
        <span className="tag">Funil vazio</span>
        <p className={styles.noticeTitle}>Nenhum lead por aqui ainda.</p>
        <p className={styles.noticeText}>
          Pra ver a tela com dados fictícios, rode <code>npm run db:seed</code>. A busca de verdade chega na
          Fase 1.
        </p>
      </div>
    );
  }

  return (
    <section className={styles.overview} aria-label="Leads por status">
      <div>
        <span className={styles.totalNumber}>{data.total}</span>
        <span className={styles.totalLabel}>leads no radar</span>
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

      <ul className={styles.grid}>
        {LEAD_STATUSES.map((status) => {
          const meta = STATUS_META[status];
          const count = data.byStatus[status];
          const share = Math.round((count / data.total) * 100);
          return (
            <li key={status} className={styles.card} data-status={status}>
              <div className={styles.cardHead}>
                <span className={styles.swatch} style={{ background: meta.color }} aria-hidden />
                <span className="tag">{meta.label}</span>
              </div>
              <span className={styles.count}>{count}</span>
              <div className={styles.cardFoot}>
                <span>{meta.hint}</span>
                <span className={styles.share}>{share}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className={styles.overview} aria-busy="true" aria-label="Carregando números do funil">
      <div className={`${styles.skeleton} ${styles.skeletonTotal}`} />
      <div className={`${styles.skeleton} ${styles.skeletonBar}`} />
      <ul className={styles.grid}>
        {LEAD_STATUSES.map((status) => (
          <li key={status} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </ul>
    </div>
  );
}

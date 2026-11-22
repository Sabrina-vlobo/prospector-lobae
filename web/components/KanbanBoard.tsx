"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type DragEvent } from "react";
import { apiGet } from "@/lib/api";
import { followupLabel, shortDate } from "@/lib/dates";
import { changeLeadStatus } from "@/lib/leadActions";
import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type Lead, type LeadStatus, type LeadsPage } from "@/lib/types";
import styles from "./KanbanBoard.module.css";

const PER_COLUMN = 50;

/** Cada coluna tem sua própria chave de cache: ["leads", "board", "NOVO"] etc. */
const columnKey = (status: LeadStatus) => ["leads", "board", status] as const;

type MoveVars = { lead: Lead; to: LeadStatus };
type Snapshot = { from: LeadsPage | undefined; to: LeadsPage | undefined };

export function KanbanBoard({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const queryClient = useQueryClient();
  // O lead sendo arrastado fica no estado: durante o "dragover" o navegador
  // não deixa ler o dataTransfer, então guardamos quem é por aqui.
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [overColumn, setOverColumn] = useState<LeadStatus | null>(null);

  const move = useMutation({
    mutationFn: ({ lead, to }: MoveVars) => changeLeadStatus(lead, to),

    // ATUALIZAÇÃO OTIMISTA: mexe no cache ANTES da API responder,
    // então o card já aparece na coluna nova, sem esperar a rede.
    onMutate: async ({ lead, to }): Promise<Snapshot> => {
      // 1) cancela buscas em andamento (senão elas sobrescreveriam nossa mudança)
      await queryClient.cancelQueries({ queryKey: ["leads", "board"] });

      // 2) guarda uma "foto" das duas colunas, pra desfazer se der erro
      const snapshot: Snapshot = {
        from: queryClient.getQueryData<LeadsPage>(columnKey(lead.status)),
        to: queryClient.getQueryData<LeadsPage>(columnKey(to)),
      };

      // 3) tira o card de uma coluna e põe no topo da outra
      queryClient.setQueryData<LeadsPage>(columnKey(lead.status), (old) =>
        old && { ...old, items: old.items.filter((l) => l.id !== lead.id), total: old.total - 1 },
      );
      queryClient.setQueryData<LeadsPage>(columnKey(to), (old) =>
        old && { ...old, items: [{ ...lead, status: to }, ...old.items], total: old.total + 1 },
      );
      return snapshot;
    },

    // Deu erro? Volta a "foto" de antes.
    onError: (_error, { lead, to }, snapshot) => {
      if (!snapshot) return;
      queryClient.setQueryData(columnKey(lead.status), snapshot.from);
      queryClient.setQueryData(columnKey(to), snapshot.to);
    },

    // Deu certo ou errado, confirma com o servidor (contadores, follow-ups, tabela...).
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  function handleDrop(event: DragEvent, to: LeadStatus) {
    event.preventDefault();
    setOverColumn(null);
    if (dragging && dragging.status !== to) move.mutate({ lead: dragging, to });
    setDragging(null);
  }

  return (
    <div className={styles.wrap}>
      {move.isError && (
        <p className={styles.error} role="alert">
          Não consegui mover o lead: {move.error.message}
        </p>
      )}

      <div className={styles.board}>
        {LEAD_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            isOver={overColumn === status && dragging?.status !== status}
            onDragOver={(e) => {
              e.preventDefault(); // sem isso o navegador não deixa soltar aqui
              setOverColumn(status);
            }}
            onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
            onDrop={(e) => handleDrop(e, status)}
            onCardDragStart={setDragging}
            onCardDragEnd={() => {
              setDragging(null);
              setOverColumn(null);
            }}
            draggingId={dragging?.id ?? null}
            onOpenLead={onOpenLead}
          />
        ))}
      </div>
    </div>
  );
}

type ColumnProps = {
  status: LeadStatus;
  isOver: boolean;
  draggingId: string | null;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onCardDragStart: (lead: Lead) => void;
  onCardDragEnd: () => void;
  onOpenLead: (id: string) => void;
};

function BoardColumn({
  status,
  isOver,
  draggingId,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardDragStart,
  onCardDragEnd,
  onOpenLead,
}: ColumnProps) {
  // NOVO costuma ter muitos: mostra primeiro os com mais avaliações.
  const sort = status === "NOVO" ? "reviews" : "recent";
  const query = useQuery({
    queryKey: columnKey(status),
    queryFn: () => apiGet<LeadsPage>(`/leads?status=${status}&sort=${sort}&pageSize=${PER_COLUMN}`),
  });
  const meta = STATUS_META[status];

  return (
    <section
      className={styles.column}
      data-over={isOver || undefined}
      aria-label={`${meta.label}: ${query.data?.total ?? 0} leads`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className={styles.columnHead}>
        <span className={styles.swatch} style={{ background: meta.color }} aria-hidden />
        <span className="tag">{meta.label}</span>
        <span className={styles.count}>{query.data?.total ?? "…"}</span>
      </header>

      <ul className={styles.cards}>
        {query.data?.items.map((lead) => (
          <li
            key={lead.id}
            className={styles.card}
            data-dragging={draggingId === lead.id || undefined}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", lead.id); // obrigatório no Firefox
              onCardDragStart(lead);
            }}
            onDragEnd={onCardDragEnd}
          >
            {/* O nome é um botão: dá pra abrir pelo teclado (e mudar o status no painel) */}
            <button type="button" className={styles.cardName} onClick={() => onOpenLead(lead.id)}>
              {lead.name}
            </button>
            <div className={styles.cardMeta}>
              {lead.websiteType === "none" ? (
                <span className={styles.noSite}>Sem site</span>
              ) : lead.websiteType === "social" ? (
                <span>Só rede social</span>
              ) : (
                <span>Tem site</span>
              )}
              {lead.rating != null && <span>★ {lead.rating.toFixed(1).replace(".", ",")}</span>}
            </div>
            {lead.status === "ENVIADO" && lead.nextFollowupAt && (
              <FollowupChip date={lead.nextFollowupAt} />
            )}
            {lead.status === "ENVIADO" && !lead.nextFollowupAt && (
              <span className={styles.chipMuted}>sem follow-up</span>
            )}
          </li>
        ))}
        {query.data && query.data.items.length === 0 && <li className={styles.empty}>Arraste um lead pra cá</li>}
      </ul>

      {query.data && query.data.total > query.data.items.length && (
        <p className={styles.more}>
          Mostrando {query.data.items.length} de {query.data.total}. Use a página Leads para filtrar.
        </p>
      )}
    </section>
  );
}

function FollowupChip({ date }: { date: string }) {
  const label = followupLabel(date);
  const due = new Date(date).getTime() <= new Date().setHours(23, 59, 59, 999);
  return (
    <span className={due ? styles.chipDue : styles.chip}>
      {due ? `follow-up ${label}` : `follow-up ${shortDate(date)}`}
    </span>
  );
}

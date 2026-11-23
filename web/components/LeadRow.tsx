"use client";

import { ArrowSquareOut, CaretDown, CaretUp, ChatCircleText, MapPin, Sparkle } from "@phosphor-icons/react";
import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";
import { MessageComposer } from "./MessageComposer";
import { NotesEditor } from "./NotesEditor";
import styles from "./LeadsTable.module.css";

type Props = {
  lead: Lead;
  /** IA configurada? Sem ela, somem: seleção, score e botão Qualificar. */
  aiEnabled: boolean;
  selected: boolean;
  expanded: boolean;
  savingStatus: boolean;
  qualifying: boolean;
  qualifyError?: string;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onQualify: () => void;
};

/** Quantas colunas a tabela tem (a linha de detalhes ocupa todas). */
export const columnCount = (aiEnabled: boolean) => (aiEnabled ? 7 : 5);

export function LeadRow({
  lead,
  aiEnabled,
  selected,
  expanded,
  savingStatus,
  qualifying,
  qualifyError,
  onToggleSelect,
  onToggleExpand,
  onStatusChange,
  onQualify,
}: Props) {
  const detailsId = `lead-details-${lead.id}`;
  const colSpan = columnCount(aiEnabled);

  return (
    <>
      <tr className={selected ? styles.rowSelected : undefined}>
        {aiEnabled && (
          <td className={styles.checkCell}>
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Selecionar ${lead.name}`}
            />
          </td>
        )}
        <td>
          <div className={styles.name}>{lead.name}</div>
          {lead.address && <div className={styles.address}>{lead.address}</div>}
        </td>
        <td>
          <WebsiteBadge lead={lead} />
        </td>
        <td className={styles.num}>
          {lead.rating != null ? (
            <>
              <span className={styles.rating}>★ {lead.rating.toFixed(1).replace(".", ",")}</span>
              <span className={styles.reviews}>{lead.reviewsCount ?? 0} aval.</span>
            </>
          ) : (
            <span className={styles.muted}>—</span>
          )}
        </td>
        {aiEnabled && (
          <td className={styles.num}>
            <ScoreBadge score={lead.score} />
          </td>
        )}
        <td>
          <select
            className={styles.statusSelect}
            data-status={lead.status}
            value={lead.status}
            disabled={savingStatus}
            onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
            aria-label={`Status de ${lead.name}`}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </td>
        <td>
          <div className={styles.actions}>
            {aiEnabled && (
              <button
                type="button"
                className={styles.qualifyButton}
                onClick={onQualify}
                disabled={qualifying}
              >
                <Sparkle size={14} weight="fill" aria-hidden />
                {qualifying ? "Qualificando…" : lead.score != null ? "Requalificar" : "Qualificar"}
              </button>
            )}
            <button
              type="button"
              className={styles.contactButton}
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-controls={detailsId}
            >
              {expanded ? (
                <>
                  Fechar <CaretUp size={14} weight="bold" aria-hidden />
                </>
              ) : (
                <>
                  <ChatCircleText size={16} aria-hidden /> Contatar <CaretDown size={14} weight="bold" aria-hidden />
                </>
              )}
            </button>
          </div>
        </td>
      </tr>

      {qualifyError && (
        <tr className={styles.errorRow}>
          <td colSpan={colSpan} role="alert">
            {qualifyError}
          </td>
        </tr>
      )}

      {expanded && (
        <tr className={styles.detailsRow} id={detailsId}>
          <td colSpan={colSpan}>
            <LeadDetails lead={lead} />
          </td>
        </tr>
      )}
    </>
  );
}

function LeadDetails({ lead }: { lead: Lead }) {
  return (
    <div className={styles.details}>
      <div className={styles.detailsCol}>
        <div>
          <span className="label">Contato</span>
          <p className={styles.detailsText}>{lead.phone ?? "Sem telefone no Google"}</p>
          {lead.address && <p className={styles.detailsSub}>{lead.address}</p>}
        </div>

        <div className={styles.contactLine}>
          {lead.mapsUrl && (
            <a className={styles.mapsLink} href={lead.mapsUrl} target="_blank" rel="noreferrer">
              <MapPin size={14} aria-hidden /> Ver no Maps
            </a>
          )}
          {lead.website && (
            <a className={styles.mapsLink} href={lead.website} target="_blank" rel="noreferrer">
              <ArrowSquareOut size={14} aria-hidden /> Ver rede/site
            </a>
          )}
        </div>

        <NotesEditor key={lead.id} lead={lead} />

        {/* Só aparece se o lead foi qualificado pela IA em algum momento */}
        {lead.hook && (
          <div>
            <span className="label">Gancho (IA)</span>
            <p className={styles.detailsText}>{lead.hook}</p>
          </div>
        )}
        {lead.scoreReason && (
          <div>
            <span className="label">Por que essa nota (IA)</span>
            <p className={styles.detailsText}>{lead.scoreReason}</p>
          </div>
        )}
      </div>

      <div className={styles.detailsCol}>
        {/* key com o status: mudou o status, o compositor recomeça no modo certo */}
        <MessageComposer key={lead.id + lead.status} lead={lead} />
      </div>
    </div>
  );
}

/** 70+ = quente (laranja), 40–69 = morno (azul), abaixo = frio. */
function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className={styles.muted}>—</span>;
  const level = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
  return (
    <span className={styles.score} data-level={level} title={`Score ${score} de 100`}>
      {score}
    </span>
  );
}

/** "Sem site" / "instagram.com" / "example.com": de onde é a presença online do negócio. */
export function WebsiteBadge({ lead }: { lead: Lead }) {
  if (lead.websiteType === "none" || !lead.website) {
    return <span className={`${styles.badge} ${styles.badgeNone}`}>Sem site</span>;
  }

  let host = lead.website;
  try {
    host = new URL(lead.website).hostname.replace(/^www\./, "");
  } catch {
    // URL estranha: mostra como veio
  }

  return (
    <a
      className={`${styles.badge} ${lead.websiteType === "social" ? styles.badgeSocial : styles.badgeReal}`}
      href={lead.website}
      target="_blank"
      rel="noreferrer"
      title={lead.website}
    >
      {host} ↗
    </a>
  );
}

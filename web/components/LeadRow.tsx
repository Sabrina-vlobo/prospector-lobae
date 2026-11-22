"use client";

import { STATUS_META } from "@/lib/status";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";
import styles from "./LeadsTable.module.css";

type Props = {
  lead: Lead;
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

export const COLUMN_COUNT = 7;

export function LeadRow({
  lead,
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

  return (
    <>
      <tr className={selected ? styles.rowSelected : undefined}>
        <td className={styles.checkCell}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Selecionar ${lead.name}`}
          />
        </td>
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
        <td className={styles.num}>
          <ScoreBadge score={lead.score} />
        </td>
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
            <button
              type="button"
              className={styles.qualifyButton}
              onClick={onQualify}
              disabled={qualifying}
            >
              {qualifying ? "Qualificando…" : lead.score != null ? "Requalificar" : "Qualificar"}
            </button>
            <button
              type="button"
              className={styles.expandButton}
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-controls={detailsId}
              aria-label={expanded ? "Fechar detalhes" : "Ver detalhes"}
            >
              {expanded ? "▴" : "▾"}
            </button>
          </div>
        </td>
      </tr>

      {qualifyError && (
        <tr className={styles.errorRow}>
          <td colSpan={COLUMN_COUNT} role="alert">
            {qualifyError}
          </td>
        </tr>
      )}

      {expanded && (
        <tr className={styles.detailsRow} id={detailsId}>
          <td colSpan={COLUMN_COUNT}>
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
        {lead.score == null ? (
          <p className={styles.muted}>
            Ainda não qualificado. Clique em <strong>Qualificar</strong> para a IA ler as avaliações e sugerir
            uma mensagem.
          </p>
        ) : (
          <>
            <div>
              <span className="tag tag--cobalt">Gancho</span>
              <p className={styles.detailsText}>{lead.hook}</p>
            </div>
            <div>
              <span className="tag">Por que essa nota</span>
              <p className={styles.detailsText}>{lead.scoreReason}</p>
            </div>
          </>
        )}

        <div className={styles.contactLine}>
          <span>{lead.phone ?? "sem telefone"}</span>
          {lead.mapsUrl && (
            <a className={styles.mapsLink} href={lead.mapsUrl} target="_blank" rel="noreferrer">
              Ver no Maps ↗
            </a>
          )}
        </div>
      </div>

      {lead.message && (
        <div className={styles.detailsCol}>
          <span className="tag">Mensagem sugerida</span>
          {/* white-space: pre-wrap respeita as quebras de linha que a IA escreveu */}
          <p className={styles.messageBubble}>{lead.message}</p>
          <span className={styles.muted}>Editar e abrir no WhatsApp chega na Fase 4.</span>
        </div>
      )}
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
function WebsiteBadge({ lead }: { lead: Lead }) {
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

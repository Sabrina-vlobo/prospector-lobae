"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { STATUS_META } from "@/lib/status";
import {
  LEAD_STATUSES,
  type Lead,
  type LeadFilters,
  type LeadSort,
  type LeadStatus,
  type LeadsPage,
  type WebsiteType,
} from "@/lib/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import styles from "./LeadsTable.module.css";

const PAGE_SIZE = 25;

// Padrão = o foco do projeto: quem não tem site ou só tem rede social.
const DEFAULT_FILTERS: LeadFilters = {
  q: "",
  websiteType: ["none", "social"],
  status: "",
  minRating: "",
  minReviews: "",
  sort: "reviews",
  page: 1,
};

const WEBSITE_OPTIONS: { value: WebsiteType; label: string }[] = [
  { value: "none", label: "Sem site" },
  { value: "social", label: "Só rede social" },
  { value: "real", label: "Com site" },
];

const SORT_OPTIONS: { value: LeadSort; label: string }[] = [
  { value: "reviews", label: "Mais avaliações" },
  { value: "rating", label: "Maior nota" },
  { value: "name", label: "Nome (A–Z)" },
  { value: "recent", label: "Mais recentes" },
];

/** Filtros da tela → query string da API (?websiteType=none,social&minRating=4...) */
function toQueryString(filters: LeadFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.websiteType.length) params.set("websiteType", filters.websiteType.join(","));
  if (filters.status) params.set("status", filters.status);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (filters.minReviews) params.set("minReviews", filters.minReviews);
  params.set("sort", filters.sort);
  params.set("page", String(filters.page));
  params.set("pageSize", String(PAGE_SIZE));
  return params.toString();
}

export function LeadsTable() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);

  // A busca por nome espera você parar de digitar; os outros filtros são instantâneos.
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const queryString = toQueryString({ ...filters, q: debouncedQ });

  const leadsQuery = useQuery({
    // A query string entra na chave: cada combinação de filtros tem seu cache.
    queryKey: ["leads", "list", queryString],
    queryFn: () => apiGet<LeadsPage>(`/leads?${queryString}`),
    // Mantém a tabela antiga na tela enquanto a nova carrega (sem "piscar").
    placeholderData: keepPreviousData,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      apiPatch<Lead>(`/leads/${id}`, { status }),
    // Recarrega tudo que começa com ["leads"]: esta lista E os contadores da visão geral.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  /** Muda um filtro e volta pra página 1 (a página 3 de outro filtro pode nem existir). */
  function update<K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? (value as number) : 1 }));
  }

  function toggleWebsiteType(type: WebsiteType) {
    const has = filters.websiteType.includes(type);
    update(
      "websiteType",
      has ? filters.websiteType.filter((t) => t !== type) : [...filters.websiteType, type],
    );
  }

  const data = leadsQuery.data;
  const totalPages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1;
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <section className={styles.wrap} aria-label="Lista de leads">
      {/* ---------- filtros ---------- */}
      <div className={styles.filters}>
        <label className={`${styles.field} ${styles.fieldSearch}`}>
          <span className="tag">Buscar por nome</span>
          <input
            className={styles.input}
            type="search"
            value={filters.q}
            onChange={(e) => update("q", e.target.value)}
            placeholder="ex: navalha"
          />
        </label>

        <fieldset className={`${styles.field} ${styles.fieldWide}`}>
          <legend className="tag">Site</legend>
          <div className={styles.toggles}>
            {WEBSITE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={styles.toggle}
                aria-pressed={filters.websiteType.includes(opt.value)}
                onClick={() => toggleWebsiteType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={styles.field}>
          <span className="tag">Status</span>
          <select
            className={styles.input}
            value={filters.status}
            onChange={(e) => update("status", e.target.value as LeadStatus | "")}
          >
            <option value="">Todos</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className="tag">Nota mínima</span>
          <select
            className={styles.input}
            value={filters.minRating}
            onChange={(e) => update("minRating", e.target.value)}
          >
            <option value="">Qualquer</option>
            <option value="4">4,0+</option>
            <option value="4.5">4,5+</option>
            <option value="4.8">4,8+</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className="tag">Mín. avaliações</span>
          <select
            className={styles.input}
            value={filters.minReviews}
            onChange={(e) => update("minReviews", e.target.value)}
          >
            <option value="">Qualquer</option>
            <option value="10">10+</option>
            <option value="50">50+</option>
            <option value="100">100+</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className="tag">Ordenar</span>
          <select
            className={styles.input}
            value={filters.sort}
            onChange={(e) => update("sort", e.target.value as LeadSort)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ---------- resumo ---------- */}
      <div className={styles.summary}>
        <span>
          {data ? (
            <>
              <strong>{data.total}</strong> {data.total === 1 ? "lead" : "leads"}
            </>
          ) : (
            "Carregando…"
          )}
          {leadsQuery.isFetching && data && <span className={styles.updating}> · atualizando</span>}
        </span>
        {!isDefault && (
          <button type="button" className={styles.linkButton} onClick={() => setFilters(DEFAULT_FILTERS)}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* ---------- tabela ---------- */}
      {leadsQuery.isError ? (
        <p className={styles.message} role="alert">
          {leadsQuery.error.message}
        </p>
      ) : !data ? (
        <div className={styles.skeleton} aria-busy="true" />
      ) : data.items.length === 0 ? (
        <p className={styles.message}>Nenhum lead com esses filtros.</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Negócio</th>
                <th scope="col">Site</th>
                <th scope="col" className={styles.num}>
                  Nota
                </th>
                <th scope="col">Telefone</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  saving={updateStatus.isPending && updateStatus.variables?.id === lead.id}
                  onStatusChange={(status) => updateStatus.mutate({ id: lead.id, status })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {updateStatus.isError && (
        <p className={styles.message} role="alert">
          Não consegui salvar o status: {updateStatus.error.message}
        </p>
      )}

      {/* ---------- paginação ---------- */}
      {data && totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Paginação">
          <button
            type="button"
            className={styles.pageButton}
            disabled={filters.page <= 1}
            onClick={() => update("page", filters.page - 1)}
          >
            ← Anterior
          </button>
          <span>
            Página {filters.page} de {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            disabled={filters.page >= totalPages}
            onClick={() => update("page", filters.page + 1)}
          >
            Próxima →
          </button>
        </nav>
      )}
    </section>
  );
}

function LeadRow({
  lead,
  saving,
  onStatusChange,
}: {
  lead: Lead;
  saving: boolean;
  onStatusChange: (status: LeadStatus) => void;
}) {
  return (
    <tr>
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
      <td className={styles.phone}>{lead.phone ?? <span className={styles.muted}>—</span>}</td>
      <td>
        <select
          className={styles.statusSelect}
          data-status={lead.status}
          value={lead.status}
          disabled={saving}
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
        {lead.mapsUrl && (
          <a
            className={styles.mapsLink}
            href={lead.mapsUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir ${lead.name} no Google Maps`}
          >
            Maps ↗
          </a>
        )}
      </td>
    </tr>
  );
}

/** "Sem site" / "instagram" / "Site": mostra de onde é a presença online do negócio. */
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

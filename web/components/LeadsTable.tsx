"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { STATUS_META } from "@/lib/status";
import {
  LEAD_STATUSES,
  type Lead,
  type LeadFilters,
  type LeadSort,
  type LeadStatus,
  type LeadsPage,
  type QualifyBatchResponse,
  type Usage,
  type WebsiteType,
} from "@/lib/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { LeadRow } from "./LeadRow";
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
  { value: "score", label: "Maior score (IA)" },
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

/** Adiciona ou remove um item de um Set sem mutar o original (o React precisa de um objeto novo). */
function toggleInSet<T>(set: Set<T>, item: T, force?: boolean): Set<T> {
  const next = new Set(set);
  const add = force ?? !next.has(item);
  if (add) next.add(item);
  else next.delete(item);
  return next;
}

export function LeadsTable() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [qualifying, setQualifying] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

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

  const usageQuery = useQuery({ queryKey: ["usage"], queryFn: () => apiGet<Usage>("/usage") });
  const ai = usageQuery.data?.anthropic;

  /** Depois de mudar leads: recarrega a lista, os contadores e o uso das cotas. */
  function refreshAfterChange() {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["usage"] });
  }

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      apiPatch<Lead>(`/leads/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  // Qualificar UM lead. Vários podem estar rodando ao mesmo tempo,
  // por isso guardamos num Set quem está "Qualificando…".
  const qualifyOne = useMutation({
    mutationFn: (id: string) => apiPost<Lead>(`/leads/${id}/qualify`, {}),
    onMutate: (id) => {
      setQualifying((s) => toggleInSet(s, id, true));
      setRowErrors(({ [id]: _old, ...rest }) => rest);
    },
    onSuccess: (lead) => setExpanded((s) => toggleInSet(s, lead.id, true)), // abre pra mostrar o resultado
    onError: (error, id) => setRowErrors((e) => ({ ...e, [id]: error.message })),
    onSettled: (_data, _error, id) => {
      setQualifying((s) => toggleInSet(s, id, false));
      refreshAfterChange();
    },
  });

  // Qualificar os selecionados, num único pedido (a API processa um de cada vez).
  const qualifyBatch = useMutation({
    mutationFn: (ids: string[]) => apiPost<QualifyBatchResponse>("/leads/qualify", { ids }),
    onMutate: (ids) => setQualifying(new Set(ids)),
    onSuccess: (response) => {
      const errors: Record<string, string> = {};
      for (const r of response.results) if (!r.ok) errors[r.id] = r.error;
      setRowErrors(errors);
      setSelected(new Set());
    },
    onSettled: () => {
      setQualifying(new Set());
      refreshAfterChange();
    },
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
  const pageIds = data?.items.map((l) => l.id) ?? [];
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const totalPages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1;
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);
  const batchMax = ai?.batchMax ?? 10;
  const tooMany = selected.size > batchMax;

  // "Selecionar todos" fica num estado intermediário (–) quando só alguns estão marcados.
  // Isso não existe como atributo HTML: precisa ser ligado direto no elemento, via ref.
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedOnPage > 0 && !allOnPageSelected;
    }
  }, [selectedOnPage, allOnPageSelected]);

  function toggleAllOnPage() {
    setSelected((s) => {
      const next = new Set(s);
      for (const id of pageIds) {
        if (allOnPageSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

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

      {/* ---------- aviso: falta chave da IA ---------- */}
      {ai && !ai.configured && (
        <p className={styles.warning}>
          Para qualificar com IA, coloque a <code>ANTHROPIC_API_KEY</code> no <code>api/.env</code> e reinicie o{" "}
          <code>npm run dev</code>.
        </p>
      )}

      {/* ---------- resumo + ações em lote ---------- */}
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
          {ai && (
            <span className={styles.aiUsage}>
              {" "}
              · IA este mês: {ai.used} de {ai.limit}
            </span>
          )}
        </span>
        {!isDefault && (
          <button type="button" className={styles.linkButton} onClick={() => setFilters(DEFAULT_FILTERS)}>
            Limpar filtros
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className={styles.bulkBar} role="region" aria-label="Ações com os selecionados">
          <span>
            <strong>{selected.size}</strong> {selected.size === 1 ? "selecionado" : "selecionados"}
            {tooMany && <span className={styles.bulkWarn}> · máximo de {batchMax} por vez</span>}
          </span>
          <div className={styles.bulkActions}>
            <button type="button" className={styles.linkButton} onClick={() => setSelected(new Set())}>
              Limpar seleção
            </button>
            <button
              type="button"
              className="btn"
              disabled={tooMany || qualifyBatch.isPending || !ai?.configured}
              onClick={() => qualifyBatch.mutate([...selected])}
            >
              {qualifyBatch.isPending ? `Qualificando ${selected.size}…` : "Qualificar selecionados"}
            </button>
          </div>
        </div>
      )}

      {qualifyBatch.isSuccess && (
        <p className={styles.batchResult} role="status">
          {qualifyBatch.data.succeeded} qualificados
          {qualifyBatch.data.failed > 0 && `, ${qualifyBatch.data.failed} com erro (veja nas linhas)`}.
        </p>
      )}
      {qualifyBatch.isError && (
        <p className={styles.message} role="alert">
          {qualifyBatch.error.message}
        </p>
      )}

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
                <th scope="col" className={styles.checkCell}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Selecionar todos desta página"
                  />
                </th>
                <th scope="col">Negócio</th>
                <th scope="col">Site</th>
                <th scope="col" className={styles.num}>
                  Nota
                </th>
                <th scope="col" className={styles.num}>
                  Score
                </th>
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
                  selected={selected.has(lead.id)}
                  expanded={expanded.has(lead.id)}
                  savingStatus={updateStatus.isPending && updateStatus.variables?.id === lead.id}
                  qualifying={qualifying.has(lead.id)}
                  qualifyError={rowErrors[lead.id]}
                  onToggleSelect={() => setSelected((s) => toggleInSet(s, lead.id))}
                  onToggleExpand={() => setExpanded((s) => toggleInSet(s, lead.id))}
                  onStatusChange={(status) => updateStatus.mutate({ id: lead.id, status })}
                  onQualify={() => qualifyOne.mutate(lead.id)}
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

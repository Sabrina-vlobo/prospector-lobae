"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { SearchInput, SearchSummary, Usage } from "@/lib/types";
import styles from "./SearchForm.module.css";

const PAGE_OPTIONS = [
  { value: 1, label: "20 · 1 chamada" },
  { value: 2, label: "40 · 2 chamadas" },
  { value: 3, label: "60 · 3 chamadas" },
];

export function SearchForm() {
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState("");
  const [city, setCity] = useState("");
  const [pages, setPages] = useState(1);
  const [skipRealSites, setSkipRealSites] = useState(true);

  // Quanto da cota do Google já foi usado neste mês
  const usageQuery = useQuery({
    queryKey: ["usage"],
    queryFn: () => apiGet<Usage>("/usage"),
  });
  const google = usageQuery.data?.google;
  const remaining = google ? Math.max(google.limit - google.used, 0) : 0;

  // useMutation = pra ações que MUDAM algo (aqui: buscar e salvar leads).
  // useQuery é pra ler; useMutation é pra escrever.
  const search = useMutation({
    mutationFn: (input: SearchInput) => apiPost<SearchSummary>("/search", input),
    onSettled: () => {
      // Deu certo ou errado, a cota pode ter mudado: recarrega o medidor.
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    },
    onSuccess: () => {
      // Leads novos no banco → os contadores do funil estão desatualizados.
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search.mutate({ segment: segment.trim(), city: city.trim(), pages, skipRealSites });
  }

  const pageOptions = PAGE_OPTIONS.filter((o) => !google || o.value <= google.maxPagesPerSearch);
  const notConfigured = google && !google.configured;
  const notEnoughQuota = google && remaining < pages;
  const disabled = search.isPending || Boolean(notConfigured) || Boolean(notEnoughQuota);

  return (
    <section className={styles.card} aria-labelledby="search-title">
      <div className={styles.head}>
        <h2 id="search-title" className={styles.title}>
          Encontrar negócios no Google
        </h2>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className="label">Segmento</span>
          <input
            className={styles.input}
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            placeholder="barbearia"
            required
            minLength={2}
            maxLength={60}
          />
        </label>

        <label className={styles.field}>
          <span className="label">Cidade</span>
          <input
            className={styles.input}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Mogi das Cruzes"
            required
            minLength={2}
            maxLength={60}
          />
        </label>

        <label className={styles.field}>
          <span className="label">Até quantos negócios</span>
          <select
            className={styles.input}
            value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
          >
            {pageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <button className={`btn ${styles.submit}`} type="submit" disabled={disabled}>
          <MagnifyingGlass size={16} weight="bold" aria-hidden />
          {search.isPending ? "Buscando…" : "Buscar"}
        </button>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={skipRealSites}
            onChange={(e) => setSkipRealSites(e.target.checked)}
          />
          <span>
            Salvar só quem <strong>não tem site</strong> ou tem <strong>só rede social</strong>
          </span>
        </label>
      </form>

      {google && (
        <div className={styles.usage}>
          <div className={styles.usageText}>
            <span className="label">Google este mês</span>
            <span>
              <strong>{google.used}</strong> de {google.limit} chamadas
            </span>
          </div>
          <div
            className={styles.meter}
            role="meter"
            aria-label="Chamadas ao Google usadas no mês"
            aria-valuemin={0}
            aria-valuemax={google.limit}
            aria-valuenow={google.used}
          >
            <span
              className={styles.meterFill}
              data-level={google.used / google.limit >= 0.8 ? "high" : "ok"}
              style={{ width: `${Math.min((google.used / Math.max(google.limit, 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {notConfigured && (
        <p className={styles.warning}>
          Falta a chave do Google. Coloque a <code>GOOGLE_PLACES_API_KEY</code> no <code>api/.env</code> e
          reinicie o <code>npm run dev</code>.
        </p>
      )}
      {!notConfigured && notEnoughQuota && (
        <p className={styles.warning}>
          Restam {remaining} chamadas este mês, menos do que essa busca usaria. Escolha uma quantidade menor.
        </p>
      )}

      {search.isError && (
        <p className={styles.error} role="alert">
          {search.error.message}
        </p>
      )}

      {search.isSuccess && <SearchResult summary={search.data} />}
    </section>
  );
}

function SearchResult({ summary }: { summary: SearchSummary }) {
  if (summary.found === 0) {
    return (
      <div className={styles.result} role="status">
        <p className={styles.resultTitle}>Nenhum negócio encontrado para “{summary.query}”.</p>
        <p className={styles.resultHint}>Tente um segmento mais comum ou outra cidade.</p>
      </div>
    );
  }

  return (
    <div className={styles.result} role="status">
      <p className={styles.resultTitle}>
        {summary.found} negócios para “{summary.query}”
      </p>
      <ul className={styles.chips}>
        <li className={styles.chip}>
          <strong>{summary.created}</strong> novos
        </li>
        <li className={styles.chip}>
          <strong>{summary.updated}</strong> já estavam salvos
        </li>
        <li className={`${styles.chip} ${styles.chipHot}`}>
          <strong>{summary.byWebsiteType.none}</strong> sem site
        </li>
        <li className={`${styles.chip} ${styles.chipWarm}`}>
          <strong>{summary.byWebsiteType.social}</strong> só rede social
        </li>
        <li className={styles.chip}>
          <strong>{summary.byWebsiteType.real}</strong> com site
          {summary.skipped > 0 && " (não salvos)"}
        </li>
      </ul>
    </div>
  );
}

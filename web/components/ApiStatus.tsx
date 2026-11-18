"use client";

import { useQuery } from "@tanstack/react-query";
import type { Health } from "@/lib/types";
import styles from "./ApiStatus.module.css";

type Connection = "online" | "db-down" | "api-down";

async function checkConnection(): Promise<Connection> {
  try {
    const res = await fetch("/api/health");
    if (res.ok) return "online";
    // 503 = a API respondeu, mas o banco não
    if (res.status === 503) {
      const body = (await res.json()) as Health;
      return body.db === "down" ? "db-down" : "api-down";
    }
    // qualquer outra coisa (ex: 500 do proxy do Next) = API fora do ar
    return "api-down";
  } catch {
    return "api-down";
  }
}

const LABEL: Record<Connection | "checking", string> = {
  checking: "Verificando",
  online: "API online",
  "db-down": "Banco offline",
  "api-down": "API offline",
};

// Selo no topo: mostra se a API e o banco estão de pé. Re-checa a cada 15s.
export function ApiStatus() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: checkConnection,
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const state = data ?? "checking";

  return (
    <span className={styles.pill} data-state={state} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden />
      <span className="tag">{LABEL[state]}</span>
    </span>
  );
}

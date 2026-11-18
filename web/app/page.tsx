import { ApiStatus } from "@/components/ApiStatus";
import { SearchForm } from "@/components/SearchForm";
import { StatusOverview } from "@/components/StatusOverview";
import styles from "./page.module.css";

// Server Component: só monta a estrutura. Quem busca dados são os
// componentes "use client" lá dentro, via TanStack Query.
export default function HomePage() {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.wordmark}>LOBAE°</span>
          <span className="tag">Prospector</span>
        </div>
        <ApiStatus />
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <span className="tag tag--cobalt">Funil · visão geral</span>
          <h1 className={styles.title}>Quem já entrou no radar e em que pé está cada conversa.</h1>
        </section>

        <SearchForm />

        <StatusOverview />
      </main>
    </div>
  );
}

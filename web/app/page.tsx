import { SearchForm } from "@/components/SearchForm";
import { StatusOverview } from "@/components/StatusOverview";
import styles from "@/components/PageLayout.module.css";

// Server Component: só monta a estrutura. Quem busca dados são os
// componentes "use client" lá dentro, via TanStack Query.
export default function HomePage() {
  return (
    <main className={styles.main}>
      <section className={styles.intro}>
        <span className="tag tag--cobalt">Funil · visão geral</span>
        <h1 className={styles.title}>Quem já entrou no radar e em que pé está cada conversa.</h1>
      </section>

      <SearchForm />

      <StatusOverview />
    </main>
  );
}

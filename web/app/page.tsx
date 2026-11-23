import { PageHeader } from "@/components/PageHeader";
import { SearchForm } from "@/components/SearchForm";
import { StatusOverview } from "@/components/StatusOverview";
import styles from "@/components/PageLayout.module.css";

// Server Component: só monta a estrutura. Quem busca dados são os
// componentes "use client" lá dentro, via TanStack Query.
export default function HomePage() {
  return (
    <main className={styles.main}>
      <PageHeader
        title="Visão geral"
        description="Quantos negócios estão em cada etapa e uma busca rápida pra trazer novos."
      />
      <StatusOverview />
      <SearchForm />
    </main>
  );
}

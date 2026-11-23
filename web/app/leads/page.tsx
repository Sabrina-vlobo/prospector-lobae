import type { Metadata } from "next";
import { LeadsTable } from "@/components/LeadsTable";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/PageLayout.module.css";

export const metadata: Metadata = { title: "Leads · LOBAE° Prospector" };

// No App Router, a PASTA vira a rota: app/leads/page.tsx = localhost:3000/leads
export default function LeadsPage() {
  return (
    <main className={styles.main}>
      <PageHeader
        eyebrow="Prospecção"
        title="Leads"
        description="Filtre quem vale a pena chamar primeiro e monte a mensagem de contato."
      />
      <LeadsTable />
    </main>
  );
}

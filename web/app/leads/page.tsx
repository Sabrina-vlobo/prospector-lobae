import type { Metadata } from "next";
import { LeadsTable } from "@/components/LeadsTable";
import styles from "@/components/PageLayout.module.css";

export const metadata: Metadata = { title: "Leads · LOBAE° Prospector" };

// No App Router, a PASTA vira a rota: app/leads/page.tsx = localhost:3000/leads
export default function LeadsPage() {
  return (
    <main className={styles.main}>
      <section className={styles.intro}>
        <span className="tag tag--cobalt">Leads</span>
        <h1 className={styles.title}>Quem vale a pena chamar primeiro.</h1>
      </section>

      <LeadsTable />
    </main>
  );
}

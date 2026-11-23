import type { Metadata } from "next";
import { FunnelView } from "@/components/FunnelView";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/components/PageLayout.module.css";

export const metadata: Metadata = { title: "Funil · LOBAE° Prospector" };

export default function FunnelPage() {
  return (
    <main className={`${styles.main} ${styles.wide}`}>
      <PageHeader
        eyebrow="Conversas"
        title="Funil"
        description="Arraste os cards conforme a conversa anda. Os follow-ups do dia ficam no topo."
      />
      <FunnelView />
    </main>
  );
}

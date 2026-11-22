import type { Metadata } from "next";
import { FunnelView } from "@/components/FunnelView";
import styles from "@/components/PageLayout.module.css";

export const metadata: Metadata = { title: "Funil · LOBAE° Prospector" };

export default function FunnelPage() {
  return (
    <main className={`${styles.main} ${styles.wide}`}>
      <section className={styles.intro}>
        <span className="tag tag--cobalt">Funil</span>
        <h1 className={styles.title}>Arraste os cards conforme a conversa anda.</h1>
      </section>

      <FunnelView />
    </main>
  );
}

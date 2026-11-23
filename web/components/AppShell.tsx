"use client";

import { Kanban, SquaresFour, Table } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiStatus } from "./ApiStatus";
import { useFollowupsToday } from "./FollowupsToday";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AppShell.module.css";

const NAV = [
  { href: "/", label: "Visão geral", Icon: SquaresFour },
  { href: "/leads", label: "Leads", Icon: Table },
  { href: "/funil", label: "Funil", Icon: Kanban },
];

/**
 * Casca do app: barra lateral (computador) ou barra no topo (celular) + conteúdo.
 * Fica no layout, então aparece em todas as páginas.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // contador de follow-ups pendentes no item "Funil" (mesmo cache da página do funil)
  const followups = useFollowupsToday();
  const pending = followups.data?.total ?? 0;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="LOBAE° Prospector, início">
          <span className={styles.wordmark}>LOBAE°</span>
          <span className="tag">Prospector</span>
        </Link>

        <nav className={styles.nav} aria-label="Principal">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={styles.link} aria-current={active ? "page" : undefined}>
                <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden />
                <span>{label}</span>
                {href === "/funil" && pending > 0 && (
                  <span className={styles.badge} aria-label={`${pending} follow-ups pendentes`}>
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <ApiStatus />
          <ThemeToggle />
        </div>
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}

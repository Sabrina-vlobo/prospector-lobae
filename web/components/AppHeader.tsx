"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiStatus } from "./ApiStatus";
import styles from "./AppHeader.module.css";

const NAV = [
  { href: "/", label: "Visão geral" },
  { href: "/leads", label: "Leads" },
];

// Fica no layout, então aparece em todas as páginas.
// É "use client" porque o usePathname (qual página está aberta) só existe no navegador.
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <Link href="/" className={styles.brand}>
          <span className={styles.wordmark}>LOBAE°</span>
          <span className="tag">Prospector</span>
        </Link>

        <nav className={styles.nav} aria-label="Principal">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.link}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <ApiStatus />
    </header>
  );
}

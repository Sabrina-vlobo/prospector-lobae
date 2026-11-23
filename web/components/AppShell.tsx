"use client";

import { Kanban, SquaresFour, Table } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiStatus } from "./ApiStatus";
import { LobaeLogo } from "./brand/LobaeLogo";
import { PixelDither } from "./brand/PixelDither";
import { useFollowupsToday } from "./FollowupsToday";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AppShell.module.css";

const NAV = [
  { href: "/", label: "Visão geral", Icon: SquaresFour },
  { href: "/leads", label: "Leads", Icon: Table },
  { href: "/funil", label: "Funil", Icon: Kanban },
];

/**
 * Casca do app com a identidade da LOBAE°: barra lateral cobalto (computador)
 * ou barra no topo (celular), logo oficial, dither em pixels e a personagem.
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
          <LobaeLogo height={30} color="var(--side-text)" />
          <span className={styles.product}>Prospector</span>
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
          {/* A personagem da marca no lugar do avatar genérico de "usuário" */}
          <div className={styles.me}>
            {/* eslint-disable-next-line @next/next/no-img-element -- pixel art: sem otimização (ela borraria os pixels) */}
            <img
              src="/brand/personagem.png"
              alt=""
              width={52}
              height={48}
              className={styles.avatar}
            />
            <span className={styles.meText}>
              <strong>Sabrina</strong>
              <span>LOBAE°</span>
            </span>
          </div>
          <ApiStatus />
          <ThemeToggle />
        </div>

        <PixelDither className={styles.dither} cols={31} rows={8} cell={8} color="var(--side-dither)" />
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}

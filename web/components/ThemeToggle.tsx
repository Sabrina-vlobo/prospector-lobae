"use client";

import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import styles from "./ThemeToggle.module.css";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Tema claro", Icon: Sun },
  { value: "system", label: "Igual ao sistema", Icon: Desktop },
  { value: "dark", label: "Tema escuro", Icon: Moon },
];

/** Seletor de 3 posições: claro / sistema / escuro. */
export function ThemeToggle() {
  // null até montar: no servidor não dá pra saber o que está no localStorage,
  // então nenhum botão aparece marcado até o navegador ler (evita erro de hidratação).
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className={styles.toggle} role="radiogroup" aria-label="Tema">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          className={styles.option}
          onClick={() => choose(value)}
        >
          <Icon size={16} weight={theme === value ? "fill" : "regular"} aria-hidden />
        </button>
      ))}
    </div>
  );
}

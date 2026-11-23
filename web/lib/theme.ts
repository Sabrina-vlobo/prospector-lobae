// Tema: "system" segue o sistema operacional; "light" e "dark" forçam um dos dois.
// A escolha fica no localStorage (é só uma preferência deste navegador).

export type Theme = "light" | "dark" | "system";
export const THEME_KEY = "lobae-theme";

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system"; // modo anônimo / armazenamento bloqueado
  }
}

/** Aplica no <html>: data-theme="light|dark", ou sem atributo pra seguir o sistema. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // sem armazenamento: o tema vale só até recarregar
  }
}

/**
 * Roda no <head>, ANTES do React e antes da primeira pintura da tela.
 * Sem isso, quem escolheu "escuro" veria um flash branco a cada carregamento.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;

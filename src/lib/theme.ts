import { useEffect, useState } from "react";

// Tema claro/escuro. A preferência fica no aparelho; "sistema" segue o macOS/Android/iOS.
export type ThemePreference = "light" | "dark" | "system";
const KEY = "jmg-theme";

export function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(pref: ThemePreference, prefersDark: boolean, path = "") {
  // Documentos para impressão/PDF são sempre claros.
  if (path.endsWith("/pdf")) return "light";
  if (pref === "system") return prefersDark ? "dark" : "light";
  return pref;
}

export function applyTheme(pref: ThemePreference) {
  const dark =
    resolveTheme(
      pref,
      window.matchMedia("(prefers-color-scheme: dark)").matches,
      window.location.pathname,
    ) === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#16181d" : "#ffffff");
}

/** Executado no <head> antes da pintura: evita o "piscar" do tema claro ao abrir no escuro. */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${KEY}");var d=location.pathname.slice(-4)!=="/pdf"&&(p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches));if(d)document.documentElement.classList.add("dark")}catch(e){}})();`;

// Estado compartilhado entre todos os componentes que usam o tema (menu, busca rápida...).
const listeners = new Set<(p: ThemePreference) => void>();

export function useTheme() {
  const [pref, setPref] = useState<ThemePreference>("system");
  useEffect(() => {
    setPref(readPreference());
    listeners.add(setPref);
    return () => void listeners.delete(setPref);
  }, []);
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);
  const update = (next: ThemePreference) => {
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // armazenamento indisponível: vale só nesta sessão
    }
    applyTheme(next);
    listeners.forEach((l) => l(next));
  };
  return { preference: pref, setPreference: update };
}

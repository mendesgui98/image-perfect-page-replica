// Abre a busca rápida (Cmd/Ctrl+K) de qualquer lugar do app.
export const OPEN_SEARCH_EVENT = "jmg:open-search";
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}
export const isMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

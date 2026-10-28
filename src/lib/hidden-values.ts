import { createContext, useContext, useSyncExternalStore } from "react";
import { fmtBRL } from "./format";

/**
 * Ocultar valores em reais no Painel e no Financeiro (ex.: com alguém olhando a tela). A escolha
 * fica só neste aparelho; fora dessas telas os valores aparecem sempre.
 */
const KEY = "jmg:ocultar-valores";
const EVENT = "jmg:ocultar-valores";

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
let memory: boolean | null = null;
export function setValuesHidden(hidden: boolean) {
  try {
    localStorage.setItem(KEY, hidden ? "1" : "0");
  } catch {
    // Sem armazenamento (aba anônima): vale só até recarregar.
  }
  memory = hidden;
  window.dispatchEvent(new Event(EVENT));
}
const snapshot = () => memory ?? read();
function subscribe(onChange: () => void) {
  const fromOtherTab = () => {
    memory = null;
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", fromOtherTab);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", fromOtherTab);
  };
}

/** Escolha salva neste aparelho (vale para o olhinho e para as telas que ocultam valores). */
export const useStoredValuesHidden = () => useSyncExternalStore(subscribe, snapshot, () => false);

export const HiddenValuesContext = createContext(false);
export const useValuesHidden = () => useContext(HiddenValuesContext);

/** Formata em reais, ou devolve a máscara quando os valores estão ocultos. */
export function useBRL() {
  const hidden = useValuesHidden();
  return (n: number | null | undefined) => (hidden ? "R$ •••••" : fmtBRL(n));
}

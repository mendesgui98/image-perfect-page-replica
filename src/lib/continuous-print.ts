// "Imprimir / salvar PDF" numa página única e contínua, como os PDFs da API: largura A4 e altura
// do documento. Mede o bloco .print-root com as mesmas regras da impressão (html.print-measure em
// styles.css) e define o tamanho da página antes de abrir a impressão do navegador. Navegadores
// que ignoram @page size (Safari) seguem com folhas A4.

/** Folga para arredondamentos do navegador não empurrarem 1 px para uma segunda página. */
const SLACK_PX = 4;

/** CSS da página única para um documento de `heightPx` de altura. */
export function continuousPageCss(heightPx: number) {
  return `@page { size: 210mm ${Math.max(1, Math.ceil(heightPx)) + SLACK_PX}px; margin: 0; }`;
}

export function printContinuous(selector = ".print-root") {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) return window.print();
  const html = document.documentElement;
  html.classList.add("print-measure");
  const height = root.getBoundingClientRect().height;
  html.classList.remove("print-measure");
  const style = document.createElement("style");
  style.textContent = continuousPageCss(height);
  document.head.append(style);
  window.addEventListener("afterprint", () => style.remove(), { once: true });
  window.print();
}

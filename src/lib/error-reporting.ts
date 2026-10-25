// Ponto único para envio de erros de interface.
// Hoje registra no console; na Fase 1 deve encaminhar para o Sentry (ou similar).
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[erro de interface]", {
    route: window.location.pathname,
    ...context,
    error,
  });
}

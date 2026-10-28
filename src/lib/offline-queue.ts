// Fila de envios pendentes para uso em obra com internet instável.
// A lógica é independente do armazenamento: em produção usa IndexedDB
// (offline-store.ts); nos testes, a implementação em memória abaixo.

export type QueuedItem<T> = {
  id: string;
  createdAt: string;
  attempts: number;
  lastError?: string | undefined;
  data: T;
};

export interface QueueStore<T> {
  all(): Promise<QueuedItem<T>[]>;
  put(item: QueuedItem<T>): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Falha de rede (sem conexão, DNS, tempo esgotado) — vale tentar de novo depois. */
export function isNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  return (
    (error instanceof TypeError && /fetch|network|load failed/i.test(message)) ||
    /failed to fetch|networkerror|network request failed|load failed/i.test(message)
  );
}

export type FlushResult = { sent: number; failed: number; pending: number; offline: boolean };

/**
 * Envia os itens em ordem de criação. Para no primeiro erro de rede (o resto espera a
 * conexão voltar); erros de outro tipo ficam registrados no item e não bloqueiam a fila.
 */
export async function flushQueue<T>(
  store: QueueStore<T>,
  send: (item: QueuedItem<T>) => Promise<void>,
): Promise<FlushResult> {
  const items = (await store.all()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let sent = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await send(item);
      await store.remove(item.id);
      sent++;
    } catch (error) {
      if (isNetworkError(error)) {
        return { sent, failed, pending: items.length - sent, offline: true };
      }
      failed++;
      await store.put({
        ...item,
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { sent, failed, pending: items.length - sent, offline: false };
}

export function memoryStore<T>(): QueueStore<T> {
  const map = new Map<string, QueuedItem<T>>();
  return {
    all: async () => [...map.values()],
    put: async (item) => void map.set(item.id, item),
    remove: async (id) => void map.delete(id),
  };
}

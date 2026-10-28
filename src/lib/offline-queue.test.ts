import { describe, expect, it } from "vitest";
import { flushQueue, isNetworkError, memoryStore, type QueuedItem } from "./offline-queue";

const item = (id: string, createdAt: string): QueuedItem<string> => ({
  id,
  createdAt,
  attempts: 0,
  data: id,
});

describe("fila offline", () => {
  it("envia em ordem de criação e esvazia a fila", async () => {
    const store = memoryStore<string>();
    await store.put(item("b", "2026-10-25T10:01:00Z"));
    await store.put(item("a", "2026-10-25T10:00:00Z"));
    const order: string[] = [];
    const r = await flushQueue(store, async (i) => void order.push(i.data));
    expect(order).toEqual(["a", "b"]);
    expect(r).toEqual({ sent: 2, failed: 0, pending: 0, offline: false });
    expect(await store.all()).toEqual([]);
  });

  it("para no primeiro erro de rede e mantém o restante", async () => {
    const store = memoryStore<string>();
    await store.put(item("a", "1"));
    await store.put(item("b", "2"));
    const r = await flushQueue(store, async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(r.offline).toBe(true);
    expect(r.pending).toBe(2);
    expect((await store.all()).map((i) => i.attempts)).toEqual([0, 0]);
  });

  it("registra erro de regra de negócio sem travar os próximos", async () => {
    const store = memoryStore<string>();
    await store.put(item("a", "1"));
    await store.put(item("b", "2"));
    const r = await flushQueue(store, async (i) => {
      if (i.id === "a") throw new Error("permissão negada");
    });
    expect(r).toEqual({ sent: 1, failed: 1, pending: 1, offline: false });
    const [left] = await store.all();
    expect(left).toMatchObject({ id: "a", attempts: 1, lastError: "permissão negada" });
  });

  it("reconhece falhas de rede comuns dos navegadores", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new TypeError("Load failed"))).toBe(true);
    // O supabase-js devolve o erro de rede como objeto com message.
    expect(isNetworkError({ message: "TypeError: Failed to fetch" })).toBe(true);
    expect(
      isNetworkError(new Error("TypeError: NetworkError when attempting to fetch resource.")),
    ).toBe(true);
    expect(isNetworkError(new Error("duplicate key value"))).toBe(false);
  });
});

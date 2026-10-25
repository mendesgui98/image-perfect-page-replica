import { beforeEach, describe, expect, it, vi } from "vitest";

const result = { data: null as unknown, error: null as unknown };
const calls: string[] = [];
const chain: Record<string, unknown> = {};
for (const m of ["from", "update", "insert", "delete", "eq", "select", "order"]) {
  chain[m] = (...args: unknown[]) => {
    calls.push(`${m}:${JSON.stringify(args)}`);
    return chain;
  };
}
chain["then"] = (resolve: (v: unknown) => unknown) => resolve(result);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => (chain["from"] as (...x: unknown[]) => unknown)(...a),
    rpc: (name: string, args: unknown) => {
      calls.push(`rpc:${name}:${JSON.stringify(args)}`);
      return Promise.resolve(result);
    },
  },
}));

const { budgetApi } = await import("./budget-api");

describe("budgetApi", () => {
  beforeEach(() => {
    calls.length = 0;
    result.data = null;
    result.error = null;
  });

  it("atualiza o orçamento filtrando pelo id", async () => {
    await budgetApi.update("b1", { status: "enviado" });
    expect(calls).toEqual(['from:["budgets"]', 'update:[{"status":"enviado"}]', 'eq:["id","b1"]']);
  });

  it("propaga o erro do banco em vez de engolir", async () => {
    result.error = new Error("bloqueado por RLS");
    await expect(budgetApi.deleteItem("i1")).rejects.toThrow("bloqueado por RLS");
  });

  it("retorna o id da cópia criada pela função copy_budget", async () => {
    result.data = "novo-id";
    await expect(budgetApi.copy("b1", true)).resolves.toBe("novo-id");
    expect(calls).toEqual(['rpc:copy_budget:{"_budget_id":"b1","_as_revision":true}']);
  });
});

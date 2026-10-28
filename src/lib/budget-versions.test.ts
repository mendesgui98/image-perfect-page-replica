import { describe, it, expect } from "vitest";
import { budgetFingerprint, hasUnsavedChanges } from "./budget-versions";

const content = (over: { quantity?: number; status?: string; updated_at?: string } = {}) => ({
  budget: {
    id: "b1",
    title: "Reforma",
    status: over.status ?? "elaboracao",
    updated_at: over.updated_at ?? "2026-10-28T10:00:00Z",
    params: { model: "custo_direto", desired_margin: 15 },
  },
  sections: [{ id: "s1", title: "Demolição", sort: 1 }],
  items: [{ id: "i1", section_id: "s1", quantity: over.quantity ?? 10, labor_cost_unit: 50 }],
});

describe("versões do orçamento", () => {
  it("mesmo conteúdo gera a mesma impressão digital", () =>
    expect(budgetFingerprint(content())).toBe(budgetFingerprint(content())));
  it("alterar um item muda a impressão digital", () =>
    expect(budgetFingerprint(content({ quantity: 12 }))).not.toBe(budgetFingerprint(content())));
  it("marcar como enviado ou só tocar na data não pede versão nova", () =>
    expect(
      budgetFingerprint(content({ status: "enviado", updated_at: "2026-10-29T08:00:00Z" })),
    ).toBe(budgetFingerprint(content())));
  it("sem versão ou com versão diferente há alterações a salvar", () => {
    const f = budgetFingerprint(content());
    expect(hasUnsavedChanges([], f)).toBe(true);
    expect(hasUnsavedChanges([{ fingerprint: "x" }, { fingerprint: f }], f)).toBe(false);
    expect(hasUnsavedChanges([{ fingerprint: f }, { fingerprint: "y" }], f)).toBe(true);
  });
});

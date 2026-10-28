import { describe, it, expect } from "vitest";
import { DIRECT_WORK_STAGES, paymentStages, stageDescription } from "./payment-stages";

const terms = [
  { label: "Início (assinatura do contrato)", pct: 30 },
  { label: "Ao iniciar etapa forro", pct: 50 },
  { label: "Entrega e finalização", pct: 20 },
];

describe("etapas de pagamento da obra", () => {
  it("usa a forma de pagamento do orçamento com o valor de cada etapa", () => {
    const stages = paymentStages(terms, 100000, []);
    expect(stages.map((s) => [s.label, s.amount])).toEqual([
      ["Início (assinatura do contrato)", 30000],
      ["Ao iniciar etapa forro", 50000],
      ["Entrega e finalização", 20000],
    ]);
  });

  it("ajusta os centavos na última etapa", () => {
    const stages = paymentStages(
      [
        { label: "A", pct: 33.33 },
        { label: "B", pct: 33.33 },
        { label: "C", pct: 33.34 },
      ],
      1000,
      [],
    );
    expect(stages.reduce((s, x) => s + (x.amount ?? 0), 0)).toBeCloseTo(1000, 2);
  });

  it("obra direta sem forma de pagamento usa etapa inicial até a 5ª, sem valor", () => {
    const stages = paymentStages([], 250000, []);
    expect(stages.map((s) => s.label)).toEqual(DIRECT_WORK_STAGES);
    expect(stages.every((s) => s.amount === null)).toBe(true);
  });

  it("marca as etapas já lançadas pela descrição", () => {
    const stages = paymentStages([], 0, [
      stageDescription("Etapa inicial", "Obra X"),
      "Outra entrada qualquer",
    ]);
    expect(stages.find((s) => s.label === "Etapa inicial")?.launched).toBe(true);
    expect(stages.find((s) => s.label === "1ª etapa")?.launched).toBe(false);
  });
});

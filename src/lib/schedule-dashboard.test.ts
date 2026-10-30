import { describe, expect, it } from "vitest";
import {
  lateStages,
  nextPayment,
  paymentState,
  progressHistory,
  shiftStageDates,
  plannedProgress,
  realizedProgress,
  scheduleListStatus,
  scheduleIndicators,
  stageExpected,
  upcomingPayments,
} from "./schedule-dashboard";

const stage = (id: string, start: string, end: string, progress = 0, weight = 0) => ({
  id,
  planned_start: start,
  planned_end: end,
  progress,
  weight,
});

describe("avanço previsto pelas datas", () => {
  it("é linear entre início e término, contando o dia inteiro", () => {
    const s = stage("a", "2026-11-16", "2026-11-25"); // 10 dias
    expect(stageExpected(s, "2026-11-15")).toBe(0);
    expect(stageExpected(s, "2026-11-16")).toBe(10);
    expect(stageExpected(s, "2026-11-20")).toBe(50);
    expect(stageExpected(s, "2026-11-25")).toBe(100);
    expect(stageExpected({ ...s, planned_start: null }, "2026-11-20")).toBe(0);
  });

  it("usa os pesos das etapas; sem pesos, todas pesam igual", () => {
    const a = stage("a", "2026-11-16", "2026-11-20", 100, 75);
    const b = stage("b", "2026-11-23", "2026-11-27", 0, 25);
    expect(plannedProgress([a, b], "2026-11-20")).toBe(75);
    expect(
      plannedProgress(
        [
          { ...a, weight: 0 },
          { ...b, weight: 0 },
        ],
        "2026-11-20",
      ),
    ).toBe(50);
  });

  it("realizado, diferença em pontos e etapas atrasadas", () => {
    const a = stage("a", "2026-11-16", "2026-11-20", 100, 50);
    const b = stage("b", "2026-11-16", "2026-11-20", 20, 50);
    expect(realizedProgress([a, b])).toBe(60);
    // Sem pesos vale o avanço inicial da obra, como no restante do sistema.
    expect(realizedProgress([{ ...a, weight: 0 }], 12)).toBe(12);
    const r = scheduleIndicators([a, b], "2026-11-23");
    expect(r).toMatchObject({ planned: 100, realized: 60, delta: -40 });
    expect(r.late.map((s) => s.id)).toEqual(["b"]);
    expect(lateStages([a, b], "2026-11-20")).toEqual([]);
  });
});

describe("pagamentos do cronograma", () => {
  const pays = [
    { date: "2026-11-09", label: "Entrada", amount: 1000, paid: 1000 },
    { date: "2026-12-04", label: "1ª medição", amount: 500 },
    { date: "2027-02-01", label: "Entrega", amount: 300, paid: 100 },
  ];
  it("próximo pagamento em aberto e soma dos próximos 30 dias", () => {
    expect(nextPayment(pays)?.label).toBe("1ª medição");
    expect(upcomingPayments(pays, "2026-11-20")).toBe(500);
    expect(upcomingPayments(pays, "2027-01-15")).toBe(700);
  });
  it("situação de cada marco", () => {
    expect(paymentState(pays[0]!, "2026-11-20")).toBe("pago");
    expect(paymentState(pays[1]!, "2026-12-10")).toBe("vencido");
    expect(paymentState(pays[2]!, "2026-11-20")).toBe("previsto");
  });
});

describe("situação do cronograma na lista", () => {
  const a = stage("a", "2026-11-16", "2026-11-20");
  it("elaboração, execução, atrasado e concluído", () => {
    expect(scheduleListStatus([{ ...a, planned_start: null }], "2026-11-18")).toBe("elaboracao");
    expect(scheduleListStatus([a], "2026-11-10")).toBe("elaboracao");
    expect(scheduleListStatus([a], "2026-11-18")).toBe("execucao");
    expect(scheduleListStatus([a], "2026-11-23")).toBe("atrasado");
    expect(scheduleListStatus([{ ...a, progress: 100 }], "2026-11-23")).toBe("concluido");
  });
  it("ignora etapa sem datas", () => {
    expect(scheduleListStatus([a, { ...a, id: "x", planned_start: null }], "2026-11-18")).toBe(
      "execucao",
    );
  });
});

describe("lançar avanço", () => {
  const st = [
    stage("a", "2026-11-16", "2026-11-20"),
    stage("b", "2026-11-23", "2026-11-27"),
    stage("c", "2026-11-18", "2026-11-19"),
  ];
  it("ajusta as etapas seguintes pelo mesmo número de dias", () => {
    expect(shiftStageDates(st, "a", "2026-11-16", "2026-11-23", true)).toEqual([
      { id: "a", planned_start: "2026-11-16", planned_end: "2026-11-23" },
      { id: "b", planned_start: "2026-11-26", planned_end: "2026-11-30" },
    ]);
    expect(shiftStageDates(st, "a", "2026-11-16", "2026-11-23", false)).toHaveLength(1);
  });
  it("histórico só com mudanças de avanço, da mais recente", () => {
    const h = progressHistory([
      {
        before: { progress: 0 },
        after: { progress: 30, observations: "Chapisco" },
        changed_at: "2026-12-02T10:00:00Z",
        changed_by: "u",
      },
      {
        before: { progress: 30 },
        after: { progress: 30, observations: "só texto" },
        changed_at: "2026-12-03T10:00:00Z",
        changed_by: "u",
      },
      {
        before: { progress: 30 },
        after: { progress: 60 },
        changed_at: "2026-12-04T10:00:00Z",
        changed_by: null,
      },
    ]);
    expect(h.map((x) => [x.progress, x.date, x.note])).toEqual([
      [60, "2026-12-04", null],
      [30, "2026-12-02", "Chapisco"],
    ]);
  });
});

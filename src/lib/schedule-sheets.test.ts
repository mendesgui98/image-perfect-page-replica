import { describe, expect, it } from "vitest";
import { buildScheduleSheets } from "./schedule-sheets";

// Datas do modelo aprovado (obra longa: 28 semanas, 3 folhas).
const dates: [string, string][] = [
  ["2027-01-11", "2027-01-22"],
  ["2027-01-25", "2027-02-12"],
  ["2027-02-08", "2027-03-05"],
  ["2027-02-22", "2027-03-19"],
  ["2027-02-22", "2027-03-26"],
  ["2027-03-22", "2027-04-02"],
  ["2027-03-22", "2027-04-16"],
  ["2027-04-12", "2027-04-30"],
  ["2027-04-19", "2027-05-21"],
  ["2027-05-10", "2027-05-28"],
  ["2027-05-24", "2027-06-04"],
  ["2027-05-31", "2027-07-02"],
  ["2027-06-28", "2027-07-09"],
  ["2027-07-12", "2027-07-23"],
];
const stages = dates.map(([start, end], i) => ({
  id: `e${i + 1}`,
  name: `Etapa ${i + 1}`,
  start,
  end,
}));
const payments = [
  { date: "2027-01-11", label: "Entrada na assinatura", amount: 97300 },
  { date: "2027-03-05", label: "1ª medição", amount: 72975 },
  { date: "2027-03-26", label: "2ª medição", amount: 72975 },
  { date: "2027-07-23", label: "Entrega da obra", amount: 48650 },
];
const materials = [
  { id: "m1", stageId: "e8", description: "Esquadrias e caixilhos", due: "2027-04-07" },
  { id: "m2", stageId: "e13", description: "Louças e metais", due: "2027-06-23" },
];

describe("cronograma em folhas de 10 semanas", () => {
  const r = buildScheduleSheets({ stages, payments, materials })!;

  it("divide 28 semanas em 3 folhas e completa a última com cinza", () => {
    expect(r.totalWeeks).toBe(28);
    expect(r.sheets.map((s) => [s.firstWeek, s.lastWeek, s.realWeeks])).toEqual([
      [1, 10, 10],
      [11, 20, 10],
      [21, 28, 8],
    ]);
    expect(r.sheets[2]!.weeks.filter((w) => w.filler)).toHaveLength(2);
    expect(r.sheets[0]!.weeks[0]).toEqual({ label: "S1", date: "2027-01-11", filler: false });
  });

  it("período de cada folha e meses do cabeçalho", () => {
    expect([r.sheets[0]!.from, r.sheets[0]!.to]).toEqual(["2027-01-11", "2027-03-19"]);
    expect([r.sheets[1]!.from, r.sheets[1]!.to]).toEqual(["2027-03-22", "2027-05-28"]);
    expect(r.sheets[2]!.to).toBe("2027-07-23");
    expect(r.sheets[0]!.months).toEqual([
      { label: "Janeiro de 2027", span: 3 },
      { label: "Fevereiro de 2027", span: 4 },
      { label: "Março de 2027", span: 3 },
    ]);
    expect(r.sheets[1]!.months[0]).toEqual({ label: "Mar/27", span: 2 });
    expect(r.sheets[2]!.months[0]).toEqual({ label: "Mai", span: 1 });
  });

  it("barras, continuação e etapas fora da folha", () => {
    const [a, b] = r.sheets;
    expect(a!.rows[0]!.cell).toEqual({
      kind: "bar",
      from: 0,
      to: 1,
      left: false,
      right: false,
      label: "2 sem.",
    });
    expect(a!.rows[4]!.cell).toMatchObject({ kind: "bar", from: 6, to: 9, right: true });
    expect(a!.rows[4]!.cell).toMatchObject({ label: "5 sem. · continua" });
    expect(a!.rows[5]!.cell).toEqual({ kind: "future", label: "inicia na S11" });
    expect(b!.rows[0]!.cell).toEqual({ kind: "done", label: "concluída na S2" });
    expect(b!.rows[4]!.cell).toMatchObject({
      kind: "bar",
      from: 0,
      to: 0,
      left: true,
      right: false,
    });
  });

  it("pagamentos e materiais caem na folha do período", () => {
    expect(r.sheets[0]!.payments.map((p) => [p.label, p.pct])).toEqual([
      ["Entrada na assinatura", 33.3],
      ["1ª medição", 25],
    ]);
    expect(r.sheets[1]!.payments.map((p) => p.label)).toEqual(["2ª medição"]);
    expect(r.sheets[2]!.payments.map((p) => p.label)).toEqual(["Entrega da obra"]);
    expect(r.sheets[1]!.materials).toEqual([
      { stage: 8, description: "Esquadrias e caixilhos", due: "2027-04-07" },
    ]);
    expect(r.sheets[1]!.rows[7]!.materials).toHaveLength(1);
    expect(r.sheets[0]!.materials).toEqual([]);
  });

  it("obra curta: 6 semanas numa folha com 4 colunas cinza", () => {
    const short = buildScheduleSheets({
      stages: [{ id: "a", name: "A", start: "2026-11-18", end: "2026-12-24" }],
    })!;
    expect(short.sheets).toHaveLength(1);
    expect(short.sheets[0]!.realWeeks).toBe(6);
    expect(short.sheets[0]!.weeks[0]!.date).toBe("2026-11-16");
  });

  it("sem datas não monta folhas", () => {
    expect(buildScheduleSheets({ stages: [{ id: "a", name: "A", start: null, end: null }] })).toBe(
      null,
    );
  });
});

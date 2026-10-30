import { describe, expect, it } from "vitest";
import { attentionItems, cashFlowMonths, greeting, lastRow, longDate } from "./dashboard-home";
import type { CompositionRow } from "./executive";

const row = (date: string, amount: number, description = "x"): CompositionRow => ({
  id: date + amount,
  workId: "w",
  work: "Obra",
  client: "C",
  description,
  date,
  amount,
  status: "",
  tab: "financeiro",
});

describe("painel inicial", () => {
  it("saudação e data por extenso", () => {
    expect([greeting(8), greeting(13), greeting(20)]).toEqual([
      "Bom dia",
      "Boa tarde",
      "Boa noite",
    ]);
    expect(longDate("2026-10-30")).toBe("Sexta-feira, 30 de outubro de 2026");
  });

  it("fluxo de caixa: realizado nos meses passados e previsto a receber a partir do atual", () => {
    const m = cashFlowMonths(
      {
        received: [row("2026-10-09", 14063.7), row("2026-08-02", 1000)],
        spent: [row("2026-10-15", -500)],
        receivable: [row("2026-09-20", 200), row("2026-11-04", 11719.75), row("2027-02-01", 9)],
      },
      "2026-10-30",
    );
    expect(m.map((x) => x.label)).toEqual(["jul", "ago", "set", "out", "nov", "dez", "jan"]);
    expect(m.find((x) => x.current)).toMatchObject({
      received: 14063.7,
      spent: 500,
      forecast: 200,
    });
    expect(m[1]!.received).toBe(1000);
    expect(m[2]!.forecast).toBe(0);
    expect(m[4]!.forecast).toBe(11719.75);
    expect(m.at(-1)!.month).toBe("2027-01");
  });

  it("último lançamento pela data", () => {
    expect(lastRow([row("2026-10-01", 1), row("2026-10-09", 2)])?.amount).toBe(2);
    expect(lastRow([])).toBeNull();
  });

  it("atenção: vencido, atraso, margem, custo e cronograma, nessa ordem", () => {
    const base = {
      id: "w1",
      name: "Obra A",
      status: "execucao",
      overdue: 0,
      margin: 0.2,
      minMargin: 10,
      costConfirmed: true,
      datedStages: 5,
      lateStages: 0,
    };
    const items = attentionItems(
      [
        { ...base, margin: 0.05, datedStages: 0 },
        { ...base, id: "w2", overdue: 500, lateStages: 2, costConfirmed: false },
        { ...base, id: "w3", status: "concluida", overdue: 99 },
      ],
      (n) => `R$ ${n}`,
    );
    expect(items.map((i) => [i.kind, i.workId])).toEqual([
      ["vencido", "w2"],
      ["atraso", "w2"],
      ["margem", "w1"],
      ["custo", "w2"],
      ["cronograma", "w1"],
    ]);
    expect(items[2]!.title).toBe("Margem 5% abaixo da mínima");
  });
});

import { describe, it, expect } from "vitest";
import {
  businessDate,
  installmentRows,
  entryState,
  periodCash,
  contractBalance,
  periodRange,
} from "./dashboard-math";
const entry = {
  id: "e",
  work_id: "w",
  direction: "entrada",
  amount: 20000,
  incurred: false,
  canceled: false,
  purchase_order_id: null,
  category: "Contrato",
  due_date: "2026-10-30",
};
describe("complemento financeiro JMG", () => {
  it("compra 12000 em quatro parcelas individuais de 3000", () => {
    const r = installmentRows(12000, 4, "2026-10-25");
    expect(r.map((x) => x.amount)).toEqual([3000, 3000, 3000, 3000]);
    expect(r.map((x) => x.due_date)).toEqual([
      "2026-10-25",
      "2026-11-25",
      "2026-12-25",
      "2027-01-25",
    ]);
  });
  it("recebimento 10000 de parcela 20000 mantém saldo 10000", () => {
    expect(
      entryState(entry, [{ entry_id: "e", amount: 10000, account_id: "a" }], "2026-10-25"),
    ).toEqual({ paid: 10000, pending: 10000, status: "parcial" });
  });
  it("caixa de 150000 recebido menos 100000 pago é 50000, não valor do contrato", () => {
    const entries = [
      { ...entry, amount: 300000 },
      { ...entry, id: "s", direction: "saida", amount: 100000 },
    ];
    const rows = [
      { entry_id: "e", amount: 150000, account_id: "a", paid_date: "2026-10-25" },
      { entry_id: "s", amount: 100000, account_id: "a", paid_date: "2026-10-25" },
    ];
    expect(periodCash(entries, rows, "", "").cash).toBe(50000);
    expect(contractBalance(300000, 150000)).toMatchObject({
      receivable: 150000,
      financialProgress: 50,
    });
  });
  it("filtra caixa pela data efetiva, não vencimento", () => {
    expect(
      periodCash(
        [entry],
        [{ entry_id: "e", amount: 10000, account_id: "a", paid_date: "2026-11-02" }],
        "2026-10-01",
        "2026-10-31",
      ).received,
    ).toBe(0);
  });
  it("arredondamento de parcelas preserva centavos e fim do mês", () => {
    const r = installmentRows(100, 3, "2026-01-31");
    expect(r.reduce((s, x) => s + Math.round(x.amount * 100), 0)).toBe(10000);
    expect(r[1]?.due_date).toBe("2026-02-28");
  });
  it("vencido mantém parcela parcialmente recebida pendente", () =>
    expect(
      entryState(entry, [{ entry_id: "e", amount: 10000, account_id: "a" }], "2026-11-01").status,
    ).toBe("vencido"));
  it("trimestre usa limites do calendário", () =>
    expect(periodRange("trimestre", new Date(2026, 9, 25))).toEqual({
      from: "2026-10-01",
      to: "2026-12-31",
    }));
});

it("data de negócio permanece em São Paulo antes da meia-noite local", () => {
  expect(businessDate(new Date("2026-10-26T01:30:00Z"))).toBe("2026-10-25");
  expect(periodRange("hoje", new Date("2026-10-26T01:30:00Z"))).toEqual({
    from: "2026-10-25",
    to: "2026-10-25",
  });
  expect(businessDate(new Date("2026-10-26T03:00:00Z"))).toBe("2026-10-26");
});

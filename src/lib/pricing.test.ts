import { describe, it, expect } from "vitest";
import { computeBudget, emptyParams, splitPayments, type PricingItem } from "./pricing";
import { reaisPorExtenso } from "./format";

const mat = (over = {}) => ({
  name: "Argamassa", consumption_unit: "kg", purchase_unit: "saco 20kg", conversion: 20,
  consumption: 5, loss_pct: 10, price: 40, supplied_by: "jmg" as const, ...over,
});

describe("precificação JMG", () => {
  const params = { ...emptyParams, labor_markup: 50, materials_markup: 20, architect_commission: 10 };
  // MO: 10 × 100 = 1000 custo -> 1500 venda. Mat: 10×5×1,1 = 55kg × R$2 = 110 custo -> 132 venda
  const items: PricingItem[] = [{ quantity: 10, labor_cost_unit: 100, materials: [mat()] }];

  it("calcula custos e consumo com perda", () => {
    const r = computeBudget(items, params);
    expect(r.laborCost).toBe(1000);
    expect(r.materialsCost).toBe(110);
    expect(r.saleNet).toBe(1632);
  });

  it("comissão incide só sobre mão de obra após o desconto", () => {
    const r = computeBudget(items, params, 163.2); // 10% de desconto geral
    expect(r.laborNet).toBe(1350);
    expect(r.materialsNet).toBe(118.8);
    expect(r.commission).toBe(135); // 10% de 1350, sem materiais
  });

  it("desconto geral é proporcional entre MO e materiais", () => {
    const r = computeBudget(items, params, 163.2);
    expect(r.laborNet / r.materialsNet).toBeCloseTo(1500 / 132, 6);
    expect(r.saleNet).toBe(1468.8);
  });

  it("material fornecido pelo cliente não gera custo nem preço", () => {
    const r = computeBudget([{ ...items[0]!, materials: [mat({ supplied_by: "cliente" })] }], params);
    expect(r.materialsCost).toBe(0);
    expect(r.materialsNet).toBe(0);
  });

  it("resultado = venda − custos − tributos − comissão, reinvestimento não deduz", () => {
    const p = { ...params, taxes: [{ name: "Imposto teste", rate: 10, base: "venda" as const }], reinvestment_share: 50 };
    const r = computeBudget(items, p);
    expect(r.taxesTotal).toBe(163.2);
    expect(r.commission).toBe(150);
    expect(r.result).toBe(1632 - 1110 - 163.2 - 150);
    expect(r.reinvestment).toBeCloseTo(r.result / 2, 2);
  });

  it("desconto máximo mantém exatamente a margem mínima", () => {
    const p = { ...params, min_margin: 20 };
    const r = computeBudget(items, p);
    const after = computeBudget(items, p, r.maxExtraDiscount);
    expect(after.margin).toBeCloseTo(0.2, 3);
    expect(after.belowMin).toBe(false);
  });

  it("reserva de negociação entra no preço mas não como custo", () => {
    const r = computeBudget(items, { ...params, negotiation_reserve: 10 });
    expect(r.totalCost).toBe(1110);
    expect(r.reserveAmount).toBe(163.2);
  });

  it("parcelas fecham o total", () => {
    const { rows } = splitPayments(270800, [
      { label: "a", pct: 30 }, { label: "b", pct: 12.5 }, { label: "c", pct: 12.5 },
      { label: "d", pct: 12.5 }, { label: "e", pct: 12.5 }, { label: "f", pct: 20 },
    ]);
    expect(rows[0]!.value).toBe(81240);
    expect(rows[5]!.value).toBe(54160);
  });

  it("valor por extenso", () => {
    expect(reaisPorExtenso(270800)).toBe("duzentos e setenta mil e oitocentos reais");
    expect(reaisPorExtenso(241000)).toBe("duzentos e quarenta e um mil reais");
    expect(reaisPorExtenso(29800)).toBe("vinte e nove mil e oitocentos reais");
  });
});

import { describe, it, expect } from "vitest";
import {
  computeBudget,
  computeWorkResult,
  emptyParams,
  marginLevel,
  priceBreakdown,
  priceFromCost,
  priceSimulation,
  suggestedPrice,
  materialCost,
  materialPackages,
  materialPurchaseQty,
  splitPayments,
  type PricingItem,
} from "./pricing";
import { reaisPorExtenso } from "./format";

const mat = (over = {}) => ({
  name: "Argamassa",
  consumption_unit: "kg",
  purchase_unit: "saco 20kg",
  conversion: 20,
  consumption: 5,
  loss_pct: 10,
  price: 40,
  supplied_by: "jmg" as const,
  ...over,
});

describe("precificação JMG", () => {
  const params = {
    ...emptyParams,
    labor_markup: 50,
    materials_markup: 20,
    architect_commission: 10,
  };
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
    const r = computeBudget(
      [
        {
          ...(items[0] ?? { quantity: 0, labor_cost_unit: 0, materials: [] }),
          materials: [mat({ supplied_by: "cliente" })],
        },
      ],
      params,
    );
    expect(r.materialsCost).toBe(0);
    expect(r.materialsNet).toBe(0);
  });

  it("resultado = venda − custos − tributos − comissão, reinvestimento não deduz", () => {
    const p = {
      ...params,
      taxes: [{ name: "Imposto teste", rate: 10, base: "venda" as const }],
      reinvestment_share: 50,
    };
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
      { label: "a", pct: 30 },
      { label: "b", pct: 12.5 },
      { label: "c", pct: 12.5 },
      { label: "d", pct: 12.5 },
      { label: "e", pct: 12.5 },
      { label: "f", pct: 20 },
    ]);
    expect(rows[0]?.value).toBe(81240);
    expect(rows[5]?.value).toBe(54160);
  });

  it("valor por extenso", () => {
    expect(reaisPorExtenso(270800)).toBe("duzentos e setenta mil e oitocentos reais");
    expect(reaisPorExtenso(241000)).toBe("duzentos e quarenta e um mil reais");
    expect(reaisPorExtenso(29800)).toBe("vinte e nove mil e oitocentos reais");
  });
});

describe("resultado econômico da obra", () => {
  it("considera custos incorridos, compromissos e estimativa sem repetir comissão", () => {
    const base = computeBudget([{ quantity: 1, labor_cost_unit: 100, materials: [] }], {
      ...emptyParams,
      labor_markup: 100,
      architect_commission: 10,
    });
    const r = computeWorkResult(base, [{ price: 50, cost: 0 }], 60, 40, 10, 20, 0);
    expect(r.sale).toBe(250);
    expect(r.cost).toBe(130);
    expect(r.result).toBe(120);
    expect(r.margin).toBe(0.48);
  });
});

it("não presume que custos ainda não registrados desapareceram", () => {
  const base = computeBudget([{ quantity: 1, labor_cost_unit: 1000, materials: [] }], {
    ...emptyParams,
    labor_markup: 50,
  });
  const r = computeWorkResult(base, [], 80, 120, null);
  expect(r.remainingEstimate).toBe(800);
  expect(r.cost).toBe(1000);
  expect(r.result).toBe(500);
  expect(r.estimateConfirmed).toBe(false);
});
it("resultado acumulado considera custo incorrido e não pagamentos de caixa", () => {
  const base = computeBudget([{ quantity: 1, labor_cost_unit: 200000, materials: [] }], {
    ...emptyParams,
    labor_markup: 50,
  });
  const r = computeWorkResult(base, [], 100000, 20000, null);
  expect(r.accumulatedResult).toBe(200000);
  expect(r.result).toBe(100000);
});

describe("rendimento de embalagem (arredonda por serviço)", () => {
  // Salva-piso: rolo de 25 m² a R$ 80, consumo 1 m² por m² de proteção.
  const salvaPiso = (over = {}) =>
    mat({
      name: "Salva-piso",
      consumption_unit: "m²",
      purchase_unit: "rolo",
      conversion: 1,
      consumption: 1,
      loss_pct: 0,
      price: 80,
      package_yield: 25,
      yield_unit: "m²",
      ...over,
    });

  it("100 m² → 4 rolos", () => {
    expect(materialPackages(salvaPiso(), 100)).toBe(4);
    expect(materialCost(salvaPiso(), 100)).toBe(320);
  });

  it("30 m² → 2 rolos (embalagem inteira)", () => {
    expect(materialPackages(salvaPiso(), 30)).toBe(2);
    expect(materialCost(salvaPiso(), 30)).toBe(160);
  });

  it("100 m² com 10% de perda → 5 rolos", () => {
    expect(materialPackages(salvaPiso({ loss_pct: 10 }), 100)).toBe(5);
    expect(materialCost(salvaPiso({ loss_pct: 10 }), 100)).toBe(400);
  });

  it("arredonda cada serviço separadamente no orçamento", () => {
    const r = computeBudget(
      [
        { quantity: 30, labor_cost_unit: 0, materials: [salvaPiso()] },
        { quantity: 30, labor_cost_unit: 0, materials: [salvaPiso()] },
      ],
      emptyParams,
    );
    // 2 + 2 rolos, não ⌈60 ÷ 25⌉ = 3
    expect(r.materialsCost).toBe(320);
  });

  it("sem rendimento mantém o cálculo fracionado atual", () => {
    const m = salvaPiso({ package_yield: null });
    expect(materialPackages(m, 100)).toBeNull();
    expect(materialCost(m, 100)).toBe(8000);
    expect(materialPurchaseQty(m, 100)).toBe(100);
    // snapshots antigos sem o campo seguem iguais
    expect(materialCost(mat(), 10)).toBeCloseTo(110, 10);
  });

  it("material fornecido pelo cliente não tem custo", () => {
    expect(materialCost(salvaPiso({ supplied_by: "cliente" }), 100)).toBe(0);
  });
});

describe("precificação pelo custo direto", () => {
  const rates = { structure: 12.5, rt: 10, taxes: 8, margin: 15 };
  const params = {
    ...emptyParams,
    model: "custo_direto" as const,
    structure_rate: 12.5,
    architect_commission: 10,
    tax_rate: 8,
    desired_margin: 15,
    min_margin: 10,
  };
  const obra = [{ quantity: 1, labor_cost_unit: 12000, materials: [] }];

  it("R$ 12.000 de custo direto vira R$ 22.018,35", () => {
    expect(priceFromCost(12000, rates)).toBe(22018.35);
    expect(suggestedPrice(22018.35)).toBe(22000);
  });

  it("abre o preço com o lucro como sobra, centavo a centavo", () => {
    const r = computeBudget(obra, params);
    expect(r.saleNet).toBe(22018.35);
    expect(r.structure).toBe(2752.29);
    expect(r.commission).toBe(2201.83);
    expect(r.taxesTotal).toBe(1761.47);
    expect(r.result).toBe(3302.76);
    expect(r.totalCost + r.structure + r.commission + r.taxesTotal + r.result).toBeCloseTo(
      r.saleNet,
      6,
    );
  });

  it("negociado a R$ 20.000: lucro de R$ 1.900 e margem de 9,5%", () => {
    const r = computeBudget(obra, { ...params, negotiated_price: 20000 });
    expect(r.saleNet).toBe(20000);
    expect(r.structure).toBe(2500);
    expect(r.commission).toBe(2000);
    expect(r.taxesTotal).toBe(1600);
    expect(r.result).toBe(1900);
    expect(r.margin).toBeCloseTo(0.095, 10);
    expect(r.totalDiscount).toBe(2018.35);
    expect(r.belowMin).toBe(true);
    expect(marginLevel(r.margin, 15, 10)).toBe("alerta");
  });

  it("RT desligada fica em zero", () => {
    expect(priceBreakdown(10000, 5000, { structure: 0, rt: 0, taxes: 0 }).rt).toBe(0);
    const r = computeBudget(obra, { ...params, apply_rt: false });
    expect(r.commission).toBe(0);
    expect(r.saleNet).toBe(priceFromCost(12000, { ...rates, rt: 0 }));
  });

  it("percentuais somando 100% ou mais não têm preço", () =>
    expect(priceFromCost(12000, { structure: 40, rt: 20, taxes: 20, margin: 20 })).toBeNull());

  it("simulador com as margens do documento", () =>
    expect(priceSimulation(12000, rates).map((r) => r.price)).toEqual([
      18604.65, 19512.2, 20168.07, 20869.57, 22018.35, 24242.42,
    ]));

  it("faixas de margem: saudável, atenção, alerta e prejuízo", () => {
    expect(marginLevel(0.15, 15, 10)).toBe("saudavel");
    expect(marginLevel(0.12, 15, 10)).toBe("atencao");
    expect(marginLevel(0.095, 15, 10)).toBe("alerta");
    expect(marginLevel(-0.01, 15, 10)).toBe("prejuizo");
  });

  it("materiais a custo e mão de obra com o restante do preço", () => {
    const r = computeBudget(
      [{ quantity: 10, labor_cost_unit: 500, materials: [mat({ price: 0, consumption: 0 })] }],
      { ...params, negotiated_price: 9000 },
    );
    expect(r.materialsNet).toBe(r.materialsCost);
    expect(r.laborNet + r.materialsNet).toBe(9000);
  });

  it("custo estrutural entra no custo econômico da obra", () => {
    const base = computeBudget(obra, params);
    const w = computeWorkResult(base, [], 12000, 0, 0);
    expect(w.result).toBeCloseTo(base.result, 6);
  });
});

/**
 * Motor de precificação da JMG.
 *
 * Fórmulas (todas explícitas, sem contagem dupla):
 *  - Custo MO do item       = quantidade × custo unitário do terceiro
 *  - Qtde material (consumo) = quantidade × consumo por unidade × (1 + perda)
 *  - Custo material         = qtde consumo × (preço de compra ÷ conversão)   [só materiais fornecidos pela JMG]
 *    -> com rendimento de embalagem: embalagens = ⌈qtde consumo ÷ rendimento⌉ (por serviço),
 *       custo = embalagens × preço da embalagem
 *  - Preço MO (lista)       = custo MO × (1 + acréscimo MO) × (1 + reserva de negociação)
 *  - Preço Mat (lista)      = custo Mat × (1 + acréscimo Mat) × (1 + reserva de negociação)
 *    -> "acréscimo" é sempre sobre CUSTO. "Margem" é sempre sobre VENDA.
 *  - Desconto do item: repartido entre MO e Mat do item, proporcional ao preço.
 *  - Desconto geral: repartido entre MO e Mat proporcional ao preço já com descontos de itens.
 *  - Venda líquida          = MO líquida + Mat líquida
 *  - Tributos/despesas      = Σ(alíquota × base) — base "venda" ou "mao_de_obra" (líquidas)
 *  - Comissão da arquiteta  = % × MO líquida  (NUNCA inclui materiais)
 *  - Resultado              = venda líquida − custo MO − custo Mat − tributos − comissão
 *  - Margem                 = resultado ÷ venda líquida
 *  - Reinvestimento         = resultado × % de destinação (não é deduzido do resultado)
 */

export type TaxBase = "venda" | "mao_de_obra";
export interface Tax {
  name: string;
  rate: number; // percentual, ex.: 6 = 6%
  base: TaxBase;
}

export interface PricingParams {
  labor_markup: number;
  materials_markup: number;
  negotiation_reserve: number;
  desired_margin: number;
  min_margin: number;
  architect_commission: number;
  reinvestment_share: number;
  taxes: Tax[];
}

export const emptyParams: PricingParams = {
  labor_markup: 0,
  materials_markup: 0,
  negotiation_reserve: 0,
  desired_margin: 0,
  min_margin: 0,
  architect_commission: 0,
  reinvestment_share: 0,
  taxes: [],
};

export interface ItemMaterial {
  material_id?: string | null;
  name: string;
  consumption_unit: string;
  purchase_unit: string;
  conversion: number; // unidades de consumo por unidade de compra
  consumption: number; // por unidade do serviço
  loss_pct: number;
  price: number; // por unidade de compra (snapshot)
  supplied_by: "jmg" | "cliente";
  package_yield?: number | null; // rendimento de 1 embalagem; nulo = compra fracionada
  yield_unit?: string | null;
}

export interface PricingItem {
  id?: string | undefined;
  quantity: number;
  labor_cost_unit: number;
  materials: ItemMaterial[];
  labor_markup_override?: number | null | undefined;
  materials_markup_override?: number | null | undefined;
  item_discount?: number | undefined;
}

export interface ItemResult {
  id?: string | undefined;
  laborCost: number;
  materialsCost: number;
  laborList: number;
  materialsList: number;
  laborNet: number;
  materialsNet: number;
  total: number;
}

export interface BudgetResult {
  items: ItemResult[];
  laborCost: number;
  materialsCost: number;
  totalCost: number;
  laborList: number;
  materialsList: number;
  listTotal: number;
  reserveAmount: number;
  itemDiscounts: number;
  generalDiscount: number;
  totalDiscount: number;
  laborNet: number;
  materialsNet: number;
  saleNet: number;
  taxes: { name: string; base: TaxBase; rate: number; baseValue: number; amount: number }[];
  taxesTotal: number;
  commission: number;
  result: number;
  margin: number; // fração (0.2 = 20%)
  reinvestment: number;
  belowMin: boolean;
  belowDesired: boolean;
  maxExtraDiscount: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number | null | undefined) => (Number(n) || 0) / 100;

export function materialQty(m: ItemMaterial, serviceQty: number) {
  return serviceQty * (Number(m.consumption) || 0) * (1 + pct(m.loss_pct));
}
/** Custo por unidade de consumo (estimativa unitária, sem arredondar embalagens). */
export function materialUnitCost(m: ItemMaterial) {
  const conv =
    Number(m.package_yield) > 0
      ? Number(m.package_yield)
      : Number(m.conversion) > 0
        ? Number(m.conversion)
        : 1;
  return (Number(m.price) || 0) / conv;
}
/** Embalagens inteiras para um serviço (arredonda por serviço); null sem rendimento. */
export function materialPackages(m: ItemMaterial, serviceQty: number) {
  const packageYield = Number(m.package_yield);
  if (!(packageYield > 0)) return null;
  return Math.max(0, Math.ceil(materialQty(m, serviceQty) / packageYield - 1e-9));
}
/** Quantidade em unidades de compra: embalagens inteiras ou fração pela conversão. */
export function materialPurchaseQty(m: ItemMaterial, serviceQty: number) {
  const conv = Number(m.conversion) > 0 ? Number(m.conversion) : 1;
  return materialPackages(m, serviceQty) ?? materialQty(m, serviceQty) / conv;
}
export function materialCost(m: ItemMaterial, serviceQty: number) {
  if (m.supplied_by === "cliente") return 0;
  const packages = materialPackages(m, serviceQty);
  if (packages !== null) return packages * (Number(m.price) || 0);
  return materialQty(m, serviceQty) * materialUnitCost(m);
}

export function computeBudget(
  items: PricingItem[],
  params: PricingParams,
  generalDiscount = 0,
): BudgetResult {
  const reserve = pct(params.negotiation_reserve);
  const pre = items.map((it) => {
    const q = Number(it.quantity) || 0;
    const laborCost = q * (Number(it.labor_cost_unit) || 0);
    const materialsCost = (it.materials || []).reduce((s, m) => s + materialCost(m, q), 0);
    const lm = it.labor_markup_override ?? params.labor_markup;
    const mm = it.materials_markup_override ?? params.materials_markup;
    const laborList = laborCost * (1 + pct(lm)) * (1 + reserve);
    const materialsList = materialsCost * (1 + pct(mm)) * (1 + reserve);
    const list = laborList + materialsList;
    const disc = Math.min(Math.max(Number(it.item_discount) || 0, 0), list);
    const lShare = list > 0 ? laborList / list : 0;
    return {
      id: it.id,
      laborCost,
      materialsCost,
      laborList,
      materialsList,
      reserveFree: laborCost * (1 + pct(lm)) + materialsCost * (1 + pct(mm)),
      laborAfterItem: laborList - disc * lShare,
      materialsAfterItem: materialsList - disc * (1 - lShare),
      disc,
    };
  });

  const afterItems = pre.reduce((s, p) => s + p.laborAfterItem + p.materialsAfterItem, 0);
  const gd = Math.min(Math.max(Number(generalDiscount) || 0, 0), afterItems);
  const factor = afterItems > 0 ? (afterItems - gd) / afterItems : 0;

  const itemResults: ItemResult[] = pre.map((p) => {
    const laborNet = p.laborAfterItem * factor;
    const materialsNet = p.materialsAfterItem * factor;
    return {
      id: p.id,
      laborCost: p.laborCost,
      materialsCost: p.materialsCost,
      laborList: p.laborList,
      materialsList: p.materialsList,
      laborNet,
      materialsNet,
      total: laborNet + materialsNet,
    };
  });

  const sum = (f: (x: (typeof itemResults)[number]) => number) =>
    itemResults.reduce((s, x) => s + f(x), 0);
  const laborCost = sum((x) => x.laborCost);
  const materialsCost = sum((x) => x.materialsCost);
  const laborList = sum((x) => x.laborList);
  const materialsList = sum((x) => x.materialsList);
  const laborNet = sum((x) => x.laborNet);
  const materialsNet = sum((x) => x.materialsNet);
  const saleNet = laborNet + materialsNet;
  const itemDiscounts = pre.reduce((s, p) => s + p.disc, 0);
  const reserveAmount = laborList + materialsList - pre.reduce((s, p) => s + p.reserveFree, 0);

  const taxes = (params.taxes || []).map((t) => {
    const baseValue = t.base === "mao_de_obra" ? laborNet : saleNet;
    return { ...t, baseValue, amount: baseValue * pct(t.rate) };
  });
  const taxesTotal = taxes.reduce((s, t) => s + t.amount, 0);
  const commission = laborNet * pct(params.architect_commission);
  const totalCost = laborCost + materialsCost;
  const result = saleNet - totalCost - taxesTotal - commission;
  const margin = saleNet > 0 ? result / saleNet : 0;

  // Desconto geral adicional máximo mantendo a margem mínima.
  // Com desconto proporcional extra d, venda e MO caem pelo mesmo fator k=(1-d).
  // margem(k) = a − C/(S·k), onde a = 1 − taxaVenda − (taxaMO+comissão)·L/S
  const sRate = (params.taxes || [])
    .filter((t) => t.base !== "mao_de_obra")
    .reduce((s, t) => s + pct(t.rate), 0);
  const lRate =
    (params.taxes || [])
      .filter((t) => t.base === "mao_de_obra")
      .reduce((s, t) => s + pct(t.rate), 0) + pct(params.architect_commission);
  let maxExtraDiscount = 0;
  if (saleNet > 0) {
    const a = 1 - sRate - (lRate * laborNet) / saleNet;
    const denom = saleNet * (a - pct(params.min_margin));
    if (denom > 0) {
      const kMin = totalCost / denom;
      maxExtraDiscount = Math.max(0, saleNet * (1 - kMin));
    }
  }

  return {
    items: itemResults,
    laborCost: r2(laborCost),
    materialsCost: r2(materialsCost),
    totalCost: r2(totalCost),
    laborList: r2(laborList),
    materialsList: r2(materialsList),
    listTotal: r2(laborList + materialsList),
    reserveAmount: r2(reserveAmount),
    itemDiscounts: r2(itemDiscounts),
    generalDiscount: r2(gd),
    totalDiscount: r2(itemDiscounts + gd),
    laborNet: r2(laborNet),
    materialsNet: r2(materialsNet),
    saleNet: r2(saleNet),
    taxes: taxes.map((t) => ({ ...t, baseValue: r2(t.baseValue), amount: r2(t.amount) })),
    taxesTotal: r2(taxesTotal),
    commission: r2(commission),
    result: r2(result),
    margin,
    reinvestment: r2(Math.max(result, 0) * pct(params.reinvestment_share)),
    belowMin: saleNet > 0 && margin < pct(params.min_margin),
    belowDesired: saleNet > 0 && margin < pct(params.desired_margin),
    maxExtraDiscount: Math.floor(maxExtraDiscount * 100) / 100,
  };
}

/** Distribui o valor total pelas condições de pagamento (%), ajustando centavos na última parcela. */
export function splitPayments(total: number, terms: { label: string; pct: number }[]) {
  const out = terms.map((t) => ({ ...t, value: r2((total * (Number(t.pct) || 0)) / 100) }));
  const pctSum = terms.reduce((s, t) => s + (Number(t.pct) || 0), 0);
  if (out.length && Math.abs(pctSum - 100) < 1e-9) {
    const diff = r2(total - out.reduce((s, t) => s + t.value, 0));
    const last = out[out.length - 1];
    if (last) last.value = r2(last.value + diff);
  }
  return { rows: out, pctSum };
}

/** Custo econômico não duplica parcelas nem pedidos já incluídos nos lançamentos. */
export function computeWorkResult(
  base: BudgetResult,
  approvedExtras: { price: number; cost: number }[],
  incurred: number,
  committed: number,
  additional: number | null,
  recordedCommission = 0,
  recordedTaxes = 0,
) {
  const extraValue = approvedExtras.reduce((s, e) => s + e.price, 0);
  const sale = base.saleNet + extraValue;
  const commission = Math.max(base.commission, recordedCommission);
  const taxes = Math.max(base.taxesTotal, recordedTaxes);
  const remainingEstimate =
    additional ??
    Math.max(
      0,
      base.totalCost + approvedExtras.reduce((s, e) => s + e.cost, 0) - incurred - committed,
    );
  const cost = incurred + committed + remainingEstimate + commission + taxes;
  const result = sale - cost;
  const accumulatedResult = sale - incurred - commission - taxes;
  return {
    sale,
    extraValue,
    commission,
    taxes,
    cost,
    result,
    accumulatedResult,
    remainingEstimate,
    estimateConfirmed: additional !== null,
    margin: sale > 0 ? result / sale : 0,
  };
}

/** Contract value supplied directly, without inferred catalog pricing or rates. */
export function directContractBase(value: number): BudgetResult {
  const r = computeBudget([], emptyParams, 0);
  return { ...r, saleNet: value, listTotal: value, result: value };
}

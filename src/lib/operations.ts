import type { ItemMaterial } from "./pricing";
import { materialPurchaseQty } from "./pricing";
export function materialKey(m: ItemMaterial) {
  return `${m.material_id || m.name}|${m.purchase_unit}|${m.supplied_by}`;
}
export function consolidateMaterials(items: { quantity: number; materials: ItemMaterial[] }[]) {
  const map = new Map<
    string,
    { key: string; name: string; unit: string; side: string; needed: number; price: number }
  >();
  for (const item of items)
    for (const m of item.materials) {
      const key = materialKey(m);
      const row = map.get(key) ?? {
        key,
        name: m.name,
        unit: m.purchase_unit,
        side: m.supplied_by,
        needed: 0,
        price: m.price,
      };
      row.needed += materialPurchaseQty(m, item.quantity);
      map.set(key, row);
    }
  return [...map.values()];
}
export function materialBalance(
  needed: number,
  reserved: number,
  ordered: number,
  received: number,
  consumed: number,
) {
  const pending = Math.max(0, ordered - received);
  return {
    pending,
    available: reserved + received - consumed,
    toBuy: Math.max(0, needed - reserved - received - pending),
  };
}
export function weightedProgress(stages: { weight: number; progress: number }[]) {
  const sum = stages.reduce((s, r) => s + r.weight, 0);
  return {
    weightSum: sum,
    valid: Math.abs(sum - 100) < 0.001,
    progress: sum ? stages.reduce((s, r) => s + r.weight * r.progress, 0) / sum : 0,
  };
}
export type EntryLike = {
  id: string;
  work_id: string | null;
  direction: string;
  amount: number;
  incurred: boolean;
  canceled: boolean;
  purchase_order_id: string | null;
  payable_order_id?: string | null;
  category: string;
};
export type SettlementLike = { entry_id: string; amount: number; account_id: string | null };
export function financeTotals(entries: EntryLike[], settlements: SettlementLike[]) {
  const active = entries.filter((e) => !e.canceled);
  const paid = (e: EntryLike) =>
    settlements.filter((s) => s.entry_id === e.id).reduce((t, s) => t + s.amount, 0);
  const sum = (direction: string, actual: boolean) =>
    active
      .filter((e) => e.direction === direction)
      .reduce((t, e) => t + (actual ? paid(e) : Math.max(0, e.amount - paid(e))), 0);
  const received = sum("entrada", true),
    spent = sum("saida", true);
  return {
    received,
    spent,
    receivable: sum("entrada", false),
    payable: sum("saida", false),
    cash: received - spent,
  };
}
export function accountBalances(
  accounts: { id: string; opening_balance: number }[],
  entries: EntryLike[],
  settlements: SettlementLike[],
  transfers: { from_account_id: string; to_account_id: string; amount: number }[],
) {
  return accounts.map((a) => ({
    ...a,
    balance:
      a.opening_balance +
      settlements
        .filter((s) => s.account_id === a.id)
        .reduce((v, s) => {
          const entry = entries.find((e) => e.id === s.entry_id && !e.canceled);
          return !entry ? v : v + (entry.direction === "entrada" ? s.amount : -s.amount);
        }, 0) +
      transfers.reduce(
        (v, t) =>
          v +
          (t.to_account_id === a.id ? t.amount : 0) -
          (t.from_account_id === a.id ? t.amount : 0),
        0,
      ),
  }));
}
export function allocatedCost(
  entries: EntryLike[],
  allocations: { entry_id: string; work_id: string; amount: number }[],
  workId?: string,
) {
  return entries
    .filter(
      (e) => !e.canceled && e.direction === "saida" && !e.purchase_order_id && !e.payable_order_id,
    )
    .reduce(
      (total, e) =>
        total +
        (workId
          ? e.work_id === workId
            ? e.amount
            : allocations
                .filter((a) => a.entry_id === e.id && a.work_id === workId)
                .reduce((t, a) => t + a.amount, 0)
          : e.amount),
      0,
    );
}

/* ---------------- Caixa x contas a receber/pagar ---------------- */
// Caixa = baixas (o que já aconteceu). Contas = lançamentos ainda em aberto (o que vai
// acontecer). Lançamento à vista (cash_only) nasce baixado e só aparece no caixa.

export type AccountEntry = EntryLike & {
  description: string;
  due_date: string;
  cash_only?: boolean;
};
export type CashSettlement = SettlementLike & {
  id: string;
  paid_date: string;
  payment_method?: string | null;
  notes?: string | null;
  file_path?: string | null;
};
export type AccountStatus = "pendente" | "vencida" | "parcial" | "recebida" | "paga" | "cancelada";

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
};

/** Situação de uma conta a receber/pagar e o destaque de vencimento (até 3 dias). */
export function accountStatus(entry: AccountEntry, settlements: SettlementLike[], today: string) {
  const paid = settlements.filter((s) => s.entry_id === entry.id).reduce((t, s) => t + s.amount, 0);
  const pending = entry.canceled ? 0 : Math.max(0, entry.amount - paid);
  const status: AccountStatus = entry.canceled
    ? "cancelada"
    : pending <= 0
      ? entry.direction === "entrada"
        ? "recebida"
        : "paga"
      : entry.due_date < today
        ? "vencida"
        : paid > 0
          ? "parcial"
          : "pendente";
  const dueSoon = pending > 0 && entry.due_date >= today && entry.due_date <= addDays(today, 3);
  return { paid, pending, status, dueSoon };
}

/** Movimentações do caixa (uma por baixa), com origem manual (à vista) ou baixa de conta. */
export function cashMovements(entries: AccountEntry[], settlements: CashSettlement[]) {
  return settlements
    .flatMap((s) => {
      const e = entries.find((x) => x.id === s.entry_id);
      if (!e || e.canceled) return [];
      return [
        {
          id: s.id,
          entry_id: e.id,
          date: s.paid_date,
          description: e.description,
          direction: e.direction as "entrada" | "saida",
          category: e.category,
          amount: s.amount,
          payment_method: s.payment_method ?? null,
          account_id: s.account_id,
          notes: s.notes ?? null,
          file_path: s.file_path ?? null,
          work_id: e.work_id,
          origin: e.cash_only ? ("manual" as const) : ("baixa" as const),
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Resumo do financeiro: saldo atual só com o realizado (mais o saldo inicial informado:
 * contas bancárias na empresa, posição inicial na obra); contas pendentes entram apenas
 * no saldo previsto. Contas canceladas ficam fora de tudo.
 */
export function cashSummary(
  entries: AccountEntry[],
  settlements: SettlementLike[],
  today: string,
  initialBalance = 0,
) {
  const active = entries.filter((e) => !e.canceled);
  const realized = settlements.reduce((t, s) => {
    const e = active.find((x) => x.id === s.entry_id);
    return !e ? t : t + (e.direction === "entrada" ? s.amount : -s.amount);
  }, 0);
  const open = (direction: string) =>
    active
      .filter((e) => e.direction === direction)
      .map((e) => accountStatus(e, settlements, today))
      .filter((st) => st.pending > 0);
  const receivable = open("entrada");
  const payable = open("saida");
  const total = (rows: ReturnType<typeof accountStatus>[]) =>
    rows.reduce((t, r) => t + r.pending, 0);
  const overdue = (rows: ReturnType<typeof accountStatus>[]) =>
    total(rows.filter((r) => r.status === "vencida"));
  const current = initialBalance + realized;
  return {
    current,
    receivable: total(receivable),
    receivableOverdue: overdue(receivable),
    payable: total(payable),
    payableOverdue: overdue(payable),
    forecast: current + total(receivable) - total(payable),
  };
}

/* ---------------- Valores da etapa ---------------- */
// Previsto = soma dos serviços da etapa. Gasto real = baixas (caixa) das saídas ligadas à
// etapa, separadas pela categoria; o que ainda está em aberto aparece como comprometido.
export function stageCosts(
  stageId: string,
  services: { stage_id: string; labor_planned: number; material_planned: number }[],
  entries: (AccountEntry & { stage_id?: string | null })[],
  settlements: SettlementLike[],
) {
  const own = services.filter((s) => s.stage_id === stageId);
  const laborPlanned = own.reduce((t, s) => t + (Number(s.labor_planned) || 0), 0);
  const materialPlanned = own.reduce((t, s) => t + (Number(s.material_planned) || 0), 0);
  const outflows = entries.filter(
    (e) => e.stage_id === stageId && e.direction === "saida" && !e.canceled,
  );
  let laborSpent = 0,
    materialSpent = 0,
    otherSpent = 0,
    committed = 0;
  for (const e of outflows) {
    const paid = settlements.filter((s) => s.entry_id === e.id).reduce((t, s) => t + s.amount, 0);
    if (e.category === "Mão de obra") laborSpent += paid;
    else if (e.category === "Materiais") materialSpent += paid;
    else otherSpent += paid;
    committed += Math.max(0, e.amount - paid);
  }
  const planned = laborPlanned + materialPlanned;
  const spent = laborSpent + materialSpent + otherSpent;
  return {
    laborPlanned,
    materialPlanned,
    planned,
    laborSpent,
    materialSpent,
    otherSpent,
    spent,
    committed,
    balance: planned - spent,
  };
}

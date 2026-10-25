import type { ItemMaterial } from "./pricing";
import { materialQty } from "./pricing";
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
      row.needed += materialQty(m, item.quantity) / (m.conversion > 0 ? m.conversion : 1);
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
export type SettlementLike = { entry_id: string; amount: number; account_id: string };
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

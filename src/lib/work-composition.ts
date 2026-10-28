import { executiveComposition, type ExecutiveData, type CompositionRow } from "./executive";
import type { WorkSummary } from "./dashboard-data";
export type WorkIndicator =
  | "contract"
  | "extras"
  | "updated"
  | "received"
  | "receivable"
  | "spent"
  | "payable"
  | "cash"
  | "current"
  | "forecast";
export function workComposition(
  data: ExecutiveData,
  s: WorkSummary,
): Record<WorkIndicator, CompositionRow[]> {
  const shared = executiveComposition(data, { work: s.work.id, pilot: true, period: "todos" });
  const row = (
    id: string,
    description: string,
    amount: number | null,
    tab = "resultado",
  ): CompositionRow => ({
    id,
    workId: s.work.id,
    work: s.work.name,
    client: s.client,
    description,
    amount,
    date: null,
    status: "posição acumulada",
    tab,
  });
  const contract = [row("contract", "Contrato original", s.base.saleNet, "contrato")];
  const updated = [...contract, ...shared.extras];
  const current = [
    ...updated,
    row("incurred", "Custos incorridos", -s.incurred),
    row("commission", "Comissão da arquiteta", -s.result.commission),
    row("taxes", "Tributos", -s.result.taxes),
  ];
  const forecast =
    s.work.origin === "direto" && !s.result.estimateConfirmed
      ? [row("unconfirmed", "Estimativa para concluir não conferida", null)]
      : [
          ...current,
          row("committed", "Compromissos futuros", -s.committed),
          row("estimate", "Estimativa restante para concluir", -s.result.remainingEstimate),
        ];
  return {
    contract,
    extras: shared.extras,
    updated,
    received: shared.received,
    receivable: shared.receivable,
    spent: shared.spent,
    payable: shared.payable,
    cash: shared.cash,
    current,
    forecast,
  };
}

import { splitPayments } from "./pricing";

// Etapas de pagamento oferecidas ao lançar uma entrada da obra. Obra vinda de
// orçamento usa a forma de pagamento do orçamento (rótulo e valor); obra cadastrada
// direto não tem forma de pagamento estruturada, então usa etapas padrão sem valor.

export const DIRECT_WORK_STAGES = [
  "Etapa inicial",
  "1ª etapa",
  "2ª etapa",
  "3ª etapa",
  "4ª etapa",
  "5ª etapa",
];

export interface PaymentStage {
  label: string;
  /** Valor da etapa pela forma de pagamento; null quando a obra não tem percentuais. */
  amount: number | null;
  /** Já existe entrada lançada com esta etapa na descrição. */
  launched: boolean;
}

export function paymentStages(
  terms: { label: string; pct: number }[],
  contractValue: number,
  launchedDescriptions: string[],
): PaymentStage[] {
  const rows = terms.length
    ? splitPayments(contractValue, terms).rows.map((r) => ({ label: r.label, amount: r.value }))
    : DIRECT_WORK_STAGES.map((label) => ({ label, amount: null }));
  return rows.map((r) => ({
    ...r,
    launched: launchedDescriptions.some((d) => d.startsWith(stageDescription(r.label, ""))),
  }));
}

/** Descrição do lançamento: começa pelo rótulo da etapa para identificar o que já foi lançado. */
export function stageDescription(label: string, workName: string) {
  return workName ? `${label} · ${workName}` : `${label} · `;
}

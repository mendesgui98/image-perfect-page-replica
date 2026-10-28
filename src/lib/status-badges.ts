import type { BadgeProps } from "@/components/ui/badge";

/**
 * Tom do selo (Badge) de cada situação, só aparência. Os textos continuam em cada tela
 * ou nos helpers de rótulo (budget-status.ts, stage-labels.ts).
 */
type Variant = NonNullable<BadgeProps["variant"]>;

export const BUDGET_STATUS_VARIANT: Record<string, Variant> = {
  elaboracao: "neutral",
  enviado: "info",
  aprovado: "positive",
  recusado: "negative",
  cancelado: "neutral",
  substituido: "neutral",
};

export const WORK_STATUS_VARIANT: Record<string, Variant> = {
  contratacao: "neutral",
  execucao: "info",
  pausada: "alert",
  concluida: "positive",
};

export const STAGE_STATUS_VARIANT: Record<string, Variant> = {
  nao_iniciado: "neutral",
  andamento: "info",
  pausado: "alert",
  concluido: "positive",
  atrasado: "negative",
};

export const CONTRACT_STATUS: Record<
  string,
  { label: string; variant: Variant; tone: "neutral" | "brand" | "positive" }
> = {
  rascunho: { label: "Rascunho", variant: "neutral", tone: "neutral" },
  gerado: { label: "Gerado", variant: "info", tone: "brand" },
  assinado: { label: "Assinado", variant: "positive", tone: "positive" },
};

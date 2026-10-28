import { weightedProgress } from "./operations";
type Stage = {
  weight: number;
  progress: number;
  status?: string | null;
  planned_end?: string | null;
};
export function physicalProgress(stages: Stage[], initial = 0) {
  return stages.some((s) => s.weight > 0) ? weightedProgress(stages).progress : initial;
}
export function stageStatus(stage: Stage, today: string) {
  if (stage.progress >= 100) return "concluido";
  if (stage.status === "pausado") return "pausado";
  if (stage.planned_end && stage.planned_end < today) return "atrasado";
  return stage.status || (stage.progress > 0 ? "andamento" : "nao_iniciado");
}
export function progressAttention(
  physical: number,
  received: number,
  incurred: number,
  forecast: number | null,
) {
  const consumed = forecast !== null && forecast > 0 ? (incurred / forecast) * 100 : null;
  return {
    consumed,
    costAhead: consumed !== null && consumed > physical,
    receiptsBehind: received < physical,
  };
}
export function workDeadline(end: string | null, progress: number, stages: Stage[], today: string) {
  if (progress >= 100) return "No prazo";
  if (end && end < today) return "Atrasada";
  if (!end || stages.some((s) => stageStatus(s, today) === "atrasado" || s.status === "pausado"))
    return "Atenção";
  return "No prazo";
}

type StageService = { labor_planned: number; material_planned: number; progress: number };
/**
 * Avanço da etapa pelos serviços, ponderado pelo valor previsto (mão de obra + material).
 * Sem valores informados, cada serviço pesa igual. Sem serviços, null (vale o avanço manual).
 */
export function servicesProgress(services: StageService[]): number | null {
  if (!services.length) return null;
  const value = (s: StageService) =>
    (Number(s.labor_planned) || 0) + (Number(s.material_planned) || 0);
  const total = services.reduce((t, s) => t + value(s), 0);
  const raw =
    total > 0
      ? services.reduce((t, s) => t + value(s) * s.progress, 0) / total
      : services.reduce((t, s) => t + s.progress, 0) / services.length;
  return Math.round(raw * 100) / 100;
}
/** Situação da etapa conforme o avanço, preservando etapa pausada. */
export function statusForProgress(progress: number, current: string | null) {
  if (progress >= 100) return "concluido";
  if (current === "pausado") return "pausado";
  return progress > 0 ? "andamento" : "nao_iniciado";
}

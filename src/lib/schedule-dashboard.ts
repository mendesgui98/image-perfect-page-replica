// Indicadores do painel de cronogramas (lista e página do cronograma): avanço previsto para hoje
// pelas datas, avanço realizado, atraso em pontos percentuais, etapas atrasadas e pagamentos.
// Módulo puro: o avanço realizado vem de physicalProgress (work-progress.ts) e o peso de cada
// etapa é o mesmo "Avanço % da obra" (weight); sem pesos, as etapas pesam igual.

import { physicalProgress } from "./work-progress";

export interface DashStage {
  id: string;
  planned_start: string | null;
  planned_end: string | null;
  weight?: number;
  progress?: number;
  status?: string | null;
}
export interface DashPayment {
  date: string;
  label: string;
  amount: number;
  /** Valor já recebido (baixas do Financeiro). */
  paid?: number;
  paidDate?: string | null;
}

const DAY = 86_400_000;
const t = (d: string) => Date.parse(`${d.slice(0, 10)}T12:00:00Z`);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Quanto da etapa já deveria estar feito em `today` (0–100), linear entre início e término. */
export function stageExpected(s: DashStage, today: string) {
  if (!s.planned_start) return 0;
  const start = t(s.planned_start);
  const end = t(s.planned_end || s.planned_start) + DAY;
  const now = t(today) + DAY;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return round1(((now - start) / (end - start)) * 100);
}

const weightOf = (stages: DashStage[]) => {
  const anyWeight = stages.some((s) => (s.weight ?? 0) > 0);
  return (s: DashStage) => (anyWeight ? Math.max(0, s.weight ?? 0) : 1);
};

/** Avanço previsto da obra para hoje, ponderado como o avanço físico. */
export function plannedProgress(stages: DashStage[], today: string) {
  const dated = stages.filter((s) => s.planned_start);
  const w = weightOf(dated);
  const total = dated.reduce((n, s) => n + w(s), 0);
  if (!total) return 0;
  return round1(dated.reduce((n, s) => n + w(s) * stageExpected(s, today), 0) / total);
}

/** Avanço realizado: o mesmo avanço físico da obra (sem pesos, vale o avanço inicial). */
export function realizedProgress(stages: DashStage[], initial = 0) {
  return round1(
    physicalProgress(
      stages.map((s) => ({ weight: s.weight ?? 0, progress: s.progress ?? 0 })),
      initial,
    ),
  );
}

/** Etapa atrasada: não concluída e com o término previsto já passado. */
export function lateStages<S extends DashStage>(stages: S[], today: string) {
  return stages.filter((s) => (s.progress ?? 0) < 100 && !!s.planned_end && s.planned_end < today);
}

export function scheduleIndicators(stages: DashStage[], today: string, initial = 0) {
  const planned = plannedProgress(stages, today);
  const realized = realizedProgress(stages, initial);
  return { planned, realized, delta: round1(realized - planned), late: lateStages(stages, today) };
}

const open = (p: DashPayment) => (p.paid ?? 0) < p.amount - 0.005;

/** Próximo pagamento em aberto (o mais antigo ainda não recebido). */
export function nextPayment(payments: DashPayment[]) {
  return [...payments].filter(open).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

/** Soma do que falta receber nos próximos `days` dias (vencidos em aberto entram também). */
export function upcomingPayments(payments: DashPayment[], today: string, days = 30) {
  const limit = t(today) + days * DAY;
  return payments
    .filter((p) => open(p) && t(p.date) <= limit)
    .reduce((n, p) => n + p.amount - (p.paid ?? 0), 0);
}

/** Situação do marco: recebido, vencido ou previsto. */
export function paymentState(p: DashPayment, today: string) {
  if (!open(p)) return "pago" as const;
  return p.date < today ? ("vencido" as const) : ("previsto" as const);
}

export type ScheduleListStatus = "elaboracao" | "execucao" | "atrasado" | "concluido";
export const SCHEDULE_LIST_STATUS: Record<ScheduleListStatus, string> = {
  elaboracao: "Em elaboração",
  execucao: "Em execução",
  atrasado: "Atrasado",
  concluido: "Concluído",
};

/**
 * Situação do cronograma na lista: sem etapas com datas ou antes do início = em elaboração;
 * todas concluídas = concluído; alguma etapa com término vencido = atrasado; senão em execução.
 * Etapas sem datas (ex.: "Avanço inicial" das obras diretas) não contam.
 */
export function scheduleListStatus(stages: DashStage[], today: string): ScheduleListStatus {
  const dated = stages.filter((s) => s.planned_start);
  if (!dated.length) return "elaboracao";
  if (dated.every((s) => (s.progress ?? 0) >= 100)) return "concluido";
  if (lateStages(dated, today).length) return "atrasado";
  const start = dated.map((s) => s.planned_start!).sort()[0]!;
  return start <= today || dated.some((s) => (s.progress ?? 0) > 0) ? "execucao" : "elaboracao";
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDaysIso = (d: string, n: number) => iso(t(d) + n * DAY);

/**
 * Datas novas de uma etapa e, com `cascade`, das etapas que começam depois do término antigo dela,
 * deslocadas pelos mesmos dias que o término andou ("Ajustar etapas seguintes automaticamente").
 */
export function shiftStageDates<S extends DashStage>(
  stages: S[],
  id: string,
  start: string,
  end: string,
  cascade: boolean,
) {
  const stage = stages.find((s) => s.id === id);
  if (!stage) return [];
  const out = [{ id, planned_start: start, planned_end: end }];
  const oldEnd = stage.planned_end || stage.planned_start;
  if (!cascade || !oldEnd) return out;
  const delta = Math.round((t(end) - t(oldEnd)) / DAY);
  if (!delta) return out;
  for (const s of stages)
    if (s.id !== id && s.planned_start && s.planned_start > oldEnd)
      out.push({
        id: s.id,
        planned_start: addDaysIso(s.planned_start, delta),
        planned_end: addDaysIso(s.planned_end || s.planned_start, delta),
      });
  return out;
}

type Snapshot = { progress?: number; observations?: string | null } | null;
/** Mudanças de avanço registradas no histórico da etapa (work_history), da mais recente. */
export function progressHistory(
  rows: { before: unknown; after: unknown; changed_at: string; changed_by: string | null }[],
) {
  return rows
    .map((r) => ({
      b: r.before as Snapshot,
      a: r.after as Snapshot,
      at: r.changed_at,
      by: r.changed_by,
    }))
    .filter((r) => r.a && Number(r.a.progress ?? 0) !== Number(r.b?.progress ?? 0))
    .map((r) => ({
      progress: Number(r.a!.progress ?? 0),
      date: r.at.slice(0, 10),
      by: r.by,
      note: r.a!.observations || null,
    }))
    .sort((x, y) => y.date.localeCompare(x.date));
}

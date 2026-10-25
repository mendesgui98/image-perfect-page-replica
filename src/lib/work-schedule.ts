import type { Json } from "@/integrations/supabase/types";
import { stageStatus } from "./work-progress";
export type ScheduleStage = {
  id: string;
  name: string;
  sort: number;
  planned_start: string | null;
  planned_end: string | null;
  responsible?: string | null;
  observations?: string | null;
  scope_services?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  progress?: number;
  status?: string | null;
};
const day = 86400000;
export function calendarDays(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const n = (Date.parse(end) - Date.parse(start)) / day;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) + 1 : null;
}
export function endFromDuration(start: string, days: number) {
  if (!start || !Number.isInteger(days) || days < 1) return "";
  return new Date(Date.parse(start) + (days - 1) * day).toISOString().slice(0, 10);
}
export function snapshotStages(value: Json): ScheduleStage[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((v) => {
      if (
        !v ||
        typeof v !== "object" ||
        Array.isArray(v) ||
        typeof v["id"] !== "string" ||
        typeof v["name"] !== "string"
      )
        return [];
      const str = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : null);
      return [
        {
          id: v["id"],
          name: v["name"],
          sort: typeof v["sort"] === "number" ? v["sort"] : 0,
          planned_start: str("planned_start"),
          planned_end: str("planned_end"),
          responsible: str("responsible"),
          observations: str("observations"),
          scope_services: str("scope_services"),
          actual_start: str("actual_start"),
          actual_end: str("actual_end"),
          ...(typeof v["progress"] === "number" ? { progress: v["progress"] } : {}),
          status: str("status"),
        },
      ];
    })
    .sort((a, b) => a.sort - b.sort);
}
export function scheduleSituation(
  stages: ScheduleStage[],
  today: string,
  fallbackEnd: string | null = null,
) {
  const end =
    stages
      .map((s) => s.planned_end)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) || fallbackEnd;
  const late = stages.filter(
    (s) => (s.progress ?? 0) < 100 && !!s.planned_end && s.planned_end < today,
  );
  const current = stages.filter(
    (s) =>
      (s.progress ?? 0) < 100 &&
      (s.status === "andamento" ||
        !!s.actual_start ||
        (!!s.planned_start && s.planned_start <= today)),
  );
  const next = stages
    .filter((s) => (s.progress ?? 0) < 100 && !current.some((c) => c.id === s.id))
    .sort(
      (a, b) =>
        (a.planned_start || "9999").localeCompare(b.planned_start || "9999") || a.sort - b.sort,
    )
    .slice(0, 2);
  const remaining = end ? Math.ceil((Date.parse(end) - Date.parse(today)) / day) : null;
  const missing = stages.some((s) => !s.planned_start || !s.planned_end);
  return {
    end,
    remaining,
    current,
    next,
    late,
    status:
      late.length ||
      (remaining !== null && remaining < 0 && stages.some((s) => (s.progress ?? 0) < 100))
        ? "Atrasado"
        : !stages.length || missing || stages.some((s) => s.status === "pausado")
          ? "Atenção"
          : "Dentro do prazo",
  };
}
export function ganttRange(stages: ScheduleStage[], original: ScheduleStage[] = []) {
  const dates = [...stages, ...original]
    .flatMap((s) => [s.planned_start, s.planned_end, s.actual_start, s.actual_end])
    .filter((v): v is string => !!v)
    .sort();
  const start = dates[0],
    end = dates.at(-1);
  if (!start || !end) return null;
  return { start, end, days: calendarDays(start, end) ?? 1 };
}
export function barGeometry(
  start: string | null | undefined,
  end: string | null | undefined,
  range: { start: string; days: number },
) {
  if (!start) return null;
  const duration = calendarDays(start, end || start);
  if (duration === null) return null;
  return {
    left: ((Date.parse(start) - Date.parse(range.start)) / day / range.days) * 100,
    width: (duration / range.days) * 100,
  };
}
export function scheduleTone(s: ScheduleStage, today: string) {
  const status = stageStatus(
    { weight: 0, progress: s.progress ?? 0, status: s.status ?? null, planned_end: s.planned_end },
    today,
  );
  return status === "atrasado"
    ? "bg-destructive"
    : status === "concluido"
      ? "bg-success"
      : status === "pausado"
        ? "bg-warning"
        : "bg-primary";
}

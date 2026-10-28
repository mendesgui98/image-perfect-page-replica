import { stageStatus } from "./work-progress";

// Agenda da equipe de campo: o que está em execução, atrasado ou vencendo hoje.

type Work = { id: string; name: string; status: string; address?: string | null };
type Stage = {
  id: string;
  work_id: string;
  name: string;
  progress: number;
  weight: number;
  status?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  responsible?: string | null;
  removed?: boolean | null;
};
type Record = {
  id: string;
  work_id: string;
  title: string;
  due_date: string | null;
  status: string;
  kind?: string;
};

const DONE_RECORD = ["aceito", "concluido"];

export type AgendaStage = Stage & { situation: "hoje" | "atrasada" };
export type WorkAgenda = {
  work: Work;
  stages: AgendaStage[];
  dueRecords: Record[];
};

/** Etapas do dia e atrasadas + pendências vencidas, agrupadas por obra ativa. */
export function fieldAgenda(works: Work[], stages: Stage[], records: Record[], today: string) {
  const active = works.filter((w) => w.status !== "concluida");
  const agenda: WorkAgenda[] = active.map((work) => {
    const own = stages.filter((s) => s.work_id === work.id && !s.removed && s.progress < 100);
    const late = own
      .filter((s) => stageStatus(s, today) === "atrasado")
      .map((s) => ({ ...s, situation: "atrasada" as const }));
    const current = own
      .filter(
        (s) =>
          stageStatus(s, today) !== "atrasado" &&
          s.status !== "pausado" &&
          !!s.planned_start &&
          s.planned_start <= today &&
          (!s.planned_end || s.planned_end >= today),
      )
      .map((s) => ({ ...s, situation: "hoje" as const }));
    const dueRecords = records.filter(
      (r) =>
        r.work_id === work.id &&
        !!r.due_date &&
        r.due_date <= today &&
        !DONE_RECORD.includes(r.status),
    );
    return { work, stages: [...late, ...current], dueRecords };
  });
  return agenda
    .filter((a) => a.stages.length || a.dueRecords.length)
    .sort(
      (a, b) =>
        b.stages.filter((s) => s.situation === "atrasada").length -
          a.stages.filter((s) => s.situation === "atrasada").length ||
        a.work.name.localeCompare(b.work.name),
    );
}

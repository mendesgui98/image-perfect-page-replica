import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { snapshotStages, type ScheduleStage } from "./work-schedule";
export type ScheduleHeader = Database["public"]["Tables"]["schedules"]["Row"];
export type EditableStage = ScheduleStage & {
  weight: number;
  progress: number;
  dependency_id: string | null;
  status: string;
  responsible: string | null;
  observations: string | null;
  scope_services: string | null;
  actual_start: string | null;
  actual_end: string | null;
};
export function editableStages(json: Json): EditableStage[] {
  return snapshotStages(json).map((s) => {
    const row = Array.isArray(json)
      ? json.find((v) => v && typeof v === "object" && !Array.isArray(v) && v["id"] === s.id)
      : null;
    const obj = row && typeof row === "object" && !Array.isArray(row) ? row : {};
    return {
      ...s,
      weight: typeof obj["weight"] === "number" ? obj["weight"] : 0,
      progress: typeof obj["progress"] === "number" ? obj["progress"] : 0,
      dependency_id: typeof obj["dependency_id"] === "string" ? obj["dependency_id"] : null,
      status: typeof obj["status"] === "string" ? obj["status"] : "nao_iniciado",
      responsible: s.responsible ?? null,
      observations: s.observations ?? null,
      scope_services: s.scope_services ?? null,
      actual_start: typeof obj["actual_start"] === "string" ? obj["actual_start"] : null,
      actual_end: typeof obj["actual_end"] === "string" ? obj["actual_end"] : null,
    };
  });
}
export const schedulesOptions = queryOptions({
  queryKey: ["schedules"],
  queryFn: async () => {
    const [h, s, w, o] = await Promise.all([
      supabase
        .from("schedules")
        .select("*")
        .is("deleted_at", null)
        .eq("archived", false)
        .order("updated_at", { ascending: false }),
      supabase.from("work_stages").select("*").eq("removed", false),
      supabase.from("work_registry").select("*").eq("archived", false).is("deleted_at", null),
      supabase.from("work_openings").select("work_id,progress"),
    ]);
    for (const r of [h, s, w, o]) if (r.error) throw r.error;
    return (h.data ?? []).map((header) => {
      const work = w.data?.find((w) => w.id === header.work_id);
      return {
        initialProgress: o.data?.find((x) => x.work_id === header.work_id)?.progress ?? 0,
        header: work
          ? {
              ...header,
              name: work.name,
              address: work.address,
              notes: work.schedule_notes,
              planned_start: work.planned_start,
              planned_end: work.planned_end,
            }
          : header,
        stages: header.work_id
          ? (s.data ?? []).filter((s) => s.work_id === header.work_id)
          : editableStages(header.standalone_stages),
      };
    });
  },
});
export const scheduleOptions = (id: string) =>
  queryOptions({
    queryKey: ["schedule", id],
    queryFn: async () => {
      const h = await supabase.from("schedules").select("*").eq("id", id).single();
      if (h.error) throw h.error;
      const header = h.data;
      if (header.work_id) {
        const [s, w, v] = await Promise.all([
          supabase
            .from("work_stages")
            .select("*")
            .eq("removed", false)
            .eq("work_id", header.work_id)
            .order("sort"),
          supabase.from("work_registry").select("*").eq("id", header.work_id).single(),
          supabase
            .from("work_schedule_versions")
            .select("*")
            .eq("work_id", header.work_id)
            .order("version"),
        ]);
        for (const r of [s, w, v]) if (r.error) throw r.error;
        return {
          header: {
            ...header,
            name: w.data?.name ?? header.name,
            address: w.data?.address ?? header.address,
            notes: w.data?.schedule_notes ?? header.notes,
            planned_start: w.data?.planned_start ?? header.planned_start,
            planned_end: w.data?.planned_end ?? header.planned_end,
          },
          stages: s.data ?? [],
          versions: v.data ?? [],
        };
      }
      const v = await supabase
        .from("schedule_versions")
        .select("*")
        .eq("schedule_id", id)
        .order("version");
      if (v.error) throw v.error;
      return { header, stages: editableStages(header.standalone_stages), versions: v.data };
    },
  });
export function scheduleStatus(stages: ScheduleStage[], today: string) {
  if (!stages.length || stages.some((s) => !s.planned_start || !s.planned_end)) return "elaboracao";
  if (stages.every((s) => (s.progress ?? 0) >= 100)) return "concluido";
  if (stages.some((s) => (s.progress ?? 0) < 100 && !!s.planned_end && s.planned_end < today))
    return "atrasado";
  return "ativo";
}

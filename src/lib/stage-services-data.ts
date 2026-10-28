import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { servicesProgress, statusForProgress } from "./work-progress";

type Stage = Database["public"]["Tables"]["work_stages"]["Row"];
export type StageService = Database["public"]["Tables"]["work_stage_services"]["Row"];

export const stageServicesOptions = (workId: string) =>
  queryOptions({
    queryKey: ["stage-services", workId],
    queryFn: async () => {
      const r = await supabase
        .from("work_stage_services")
        .select("*")
        .eq("work_id", workId)
        .order("sort");
      if (r.error) throw r.error;
      return r.data;
    },
  });

/** Grava na etapa o avanço calculado pelos serviços (ponderado pelo valor). */
export async function syncStageProgress(stage: Stage, services: StageService[]) {
  const progress = servicesProgress(services);
  if (progress === null || progress === stage.progress) return;
  const r = await supabase
    .from("work_stages")
    .update({ progress, status: statusForProgress(progress, stage.status) })
    .eq("id", stage.id);
  if (r.error) throw r.error;
}

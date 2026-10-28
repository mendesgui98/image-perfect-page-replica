import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChecklistItem = Database["public"]["Tables"]["work_checklist_items"]["Row"];

/** Itens do checklist da obra e o nome de quem conferiu cada um. */
export const checklistOptions = (workId: string) =>
  queryOptions({
    queryKey: ["work-checklist", workId],
    queryFn: async () => {
      const r = await supabase
        .from("work_checklist_items")
        .select("*")
        .eq("work_id", workId)
        .order("sort")
        .order("created_at");
      if (r.error) throw r.error;
      const ids = [...new Set(r.data.map((i) => i.checked_by).filter((x): x is string => !!x))];
      const p = ids.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", ids)
        : { data: [], error: null };
      if (p.error) throw p.error;
      const names = Object.fromEntries(
        (p.data ?? []).map((x) => [x.id, x.full_name || x.email || "Usuário"]),
      );
      return { items: r.data, names: names as Record<string, string> };
    },
  });

/** Quantos itens foram conferidos e o percentual (0 quando não há itens). */
export function checklistCount(items: Pick<ChecklistItem, "checked">[]) {
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * Agrupa os itens pelas etapas ativas, na ordem do cronograma. Itens de etapas removidas
 * ficam de fora (as etapas removidas só existem para auditoria).
 */
export function checklistByStage<S extends { id: string }, I extends ChecklistItem>(
  stages: S[],
  items: I[],
) {
  return stages.map((stage) => {
    const own = items
      .filter((i) => i.stage_id === stage.id)
      .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));
    return { stage, items: own, ...checklistCount(own) };
  });
}

/** Próxima posição para um item avulso no fim da etapa. */
export const nextChecklistSort = (items: Pick<ChecklistItem, "sort">[]) =>
  items.reduce((max, i) => Math.max(max, i.sort), 0) + 1;

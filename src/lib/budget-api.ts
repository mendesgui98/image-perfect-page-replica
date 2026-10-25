import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Acesso a dados do módulo de orçamentos. Componentes não chamam o Supabase direto:
// usam estas funções (escrita) e as query options (leitura).

type Tables = Database["public"]["Tables"];
type BudgetUpdate = Tables["budgets"]["Update"];
type SectionInsert = Tables["budget_sections"]["Insert"];
type SectionUpdate = Tables["budget_sections"]["Update"];
type ItemInsert = Tables["budget_items"]["Insert"];
type ItemUpdate = Tables["budget_items"]["Update"];
type HistoryInsert = Tables["budget_history"]["Insert"];

async function check<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export const stagesOptions = {
  queryKey: ["stages"],
  queryFn: async () => (await check(supabase.from("stages").select("*").order("sort"))) ?? [],
};

export const activeServicesOptions = {
  queryKey: ["services-full"],
  queryFn: async () =>
    (await check(
      supabase
        .from("services")
        .select("*, service_materials(*, materials(*))")
        .eq("active", true)
        .order("description"),
    )) ?? [],
};

export const budgetApi = {
  update: (id: string, patch: BudgetUpdate | Record<string, unknown>) =>
    check(
      supabase
        .from("budgets")
        .update(patch as BudgetUpdate)
        .eq("id", id),
    ),
  /** Duplica a proposta ou cria revisão (função transacional no banco). */
  copy: async (id: string, asRevision: boolean) =>
    (await check(
      supabase.rpc("copy_budget", { _budget_id: id, _as_revision: asRevision }),
    )) as string,
  logHistory: (row: HistoryInsert) => check(supabase.from("budget_history").insert(row)),

  addSection: (row: SectionInsert) => check(supabase.from("budget_sections").insert(row)),
  updateSection: (id: string, patch: SectionUpdate) =>
    check(supabase.from("budget_sections").update(patch).eq("id", id)),
  deleteSection: (id: string) => check(supabase.from("budget_sections").delete().eq("id", id)),

  addItem: (row: ItemInsert) => check(supabase.from("budget_items").insert(row)),
  updateItem: (id: string, patch: ItemUpdate | Record<string, unknown>) =>
    check(
      supabase
        .from("budget_items")
        .update(patch as ItemUpdate)
        .eq("id", id),
    ),
  deleteItem: (id: string) => check(supabase.from("budget_items").delete().eq("id", id)),
};

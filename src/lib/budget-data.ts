import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { emptyParams, type ItemMaterial, type PricingParams } from "./pricing";

export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type Section = Database["public"]["Tables"]["budget_sections"]["Row"];
export type Item = Omit<Database["public"]["Tables"]["budget_items"]["Row"], "materials"> & { materials: ItemMaterial[] };
export type Term = { label: string; pct: number };

export async function loadBudget(id: string) {
  const [b, s, i] = await Promise.all([
    supabase.from("budgets").select("*").eq("id", id).single(),
    supabase.from("budget_sections").select("*").eq("budget_id", id).order("sort"),
    supabase.from("budget_items").select("*").eq("budget_id", id).order("sort"),
  ]);
  if (b.error) throw b.error;
  if (s.error) throw s.error;
  if (i.error) throw i.error;
  return {
    budget: b.data,
    params: { ...emptyParams, ...((b.data.params as object) ?? {}) } as PricingParams,
    terms: ((b.data.payment_terms as unknown as Term[]) ?? []) as Term[],
    sections: s.data ?? [],
    items: (i.data ?? []) as unknown as Item[],
  };
}

export const budgetKey = (id: string) => ["budget", id] as const;

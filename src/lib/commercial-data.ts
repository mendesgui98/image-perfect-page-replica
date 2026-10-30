import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Item } from "./budget-data";
import { computeBudget, emptyParams, type PricingParams } from "./pricing";
import type { FunnelBudget } from "./business-indicators";

/**
 * Orçamentos para o funil comercial do Painel, com o valor de venda de computeBudget (o mesmo da
 * lista de orçamentos). Itens lidos de uma vez para não fazer uma consulta por orçamento.
 */
export const commercialOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: ["commercial-funnel", enabled],
    enabled,
    queryFn: async (): Promise<FunnelBudget[]> => {
      const b = await supabase
        .from("budgets")
        .select(
          "id,number,revision,status,issue_date,approval_date,refusal_reason,params,general_discount",
        )
        .is("deleted_at", null)
        .eq("archived", false);
      if (b.error) throw b.error;
      const ids = b.data.map((x) => x.id);
      const items = ids.length
        ? await supabase.from("budget_items").select("*").in("budget_id", ids)
        : { data: [], error: null };
      if (items.error) throw items.error;
      const all = (items.data ?? []) as unknown as Item[];
      return b.data.map((x) => ({
        number: x.number,
        revision: x.revision,
        status: x.status,
        issue_date: x.issue_date,
        approval_date: x.approval_date,
        refusal_reason: x.refusal_reason,
        value: computeBudget(
          all.filter((i) => i.budget_id === x.id),
          { ...emptyParams, ...((x.params as object) ?? {}) } as PricingParams,
          x.general_discount,
        ).saleNet,
      }));
    },
  });

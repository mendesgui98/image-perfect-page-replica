import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Item } from "./budget-data";
import { computeBudget, emptyParams, type PricingParams } from "./pricing";
import type { FunnelBudget } from "./business-indicators";
import type { FollowUpBudget } from "./panel-insights";

/**
 * Orçamentos para o funil comercial do Painel, com o valor de venda de computeBudget (o mesmo da
 * lista de orçamentos). Itens lidos de uma vez para não fazer uma consulta por orçamento; o cliente
 * e o telefone servem à lista de follow-up.
 */
export const commercialOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: ["commercial-funnel", enabled],
    enabled,
    queryFn: async (): Promise<(FunnelBudget & FollowUpBudget)[]> => {
      const b = await supabase
        .from("budgets")
        .select(
          "id,number,revision,status,issue_date,approval_date,refusal_reason,params,general_discount,title,client_id,client_display",
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
      const clientIds = [...new Set(b.data.map((x) => x.client_id).filter(Boolean))] as string[];
      const people = clientIds.length
        ? await supabase.from("people").select("id,name,phone").in("id", clientIds)
        : { data: [], error: null };
      if (people.error) throw people.error;
      const person = new Map((people.data ?? []).map((p) => [p.id, p]));
      return b.data.map((x) => ({
        id: x.id,
        title: x.title,
        client:
          (x.client_id ? person.get(x.client_id)?.name : null) || x.client_display || "Cliente",
        phone: (x.client_id ? person.get(x.client_id)?.phone : null) ?? null,
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

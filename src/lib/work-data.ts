import { queryOptions } from "@tanstack/react-query";
import { compressImage } from "./image-compress";
import { supabase } from "@/integrations/supabase/client";
export const worksOptions = queryOptions({
  queryKey: ["works"],
  queryFn: async () => {
    const r = await supabase
      .from("work_registry")
      .select("*")
      .eq("archived", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (r.error) throw r.error;
    return r.data;
  },
});
export const scheduleVersionsOptions = (id: string) =>
  queryOptions({
    queryKey: ["schedule-versions", id],
    queryFn: async () => {
      const r = await supabase
        .from("work_schedule_versions")
        .select("*")
        .eq("work_id", id)
        .order("version");
      if (r.error) throw r.error;
      return r.data;
    },
  });
export const workOptions = (id: string) =>
  queryOptions({
    queryKey: ["work", id],
    queryFn: async () => {
      const [w, s, r] = await Promise.all([
        supabase.from("work_registry").select("*").eq("id", id).single(),
        supabase
          .from("work_stages")
          .select("*")
          .eq("removed", false)
          .eq("work_id", id)
          .order("sort"),
        supabase
          .from("work_records")
          .select("*")
          .eq("work_id", id)
          .order("record_date", { ascending: false }),
      ]);
      if (w.error) throw w.error;
      if (s.error) throw s.error;
      if (r.error) throw r.error;
      return { work: w.data, stages: s.data, records: r.data };
    },
  });
/** Envia um arquivo ao bucket privado. Fotos grandes são comprimidas antes do envio. */
export async function uploadDocument(original: File, folder: string) {
  const file = await compressImage(original);
  const path = `${folder}/${crypto.randomUUID()}.${
    file.name
      .split(".")
      .at(-1)
      ?.replace(/[^a-zA-Z0-9]/g, "") || "bin"
  }`;
  const r = await supabase.storage.from("jmg-documents").upload(path, file);
  if (r.error) throw r.error;
  return path;
}
export async function openDocument(path: string) {
  const r = await supabase.storage.from("jmg-documents").createSignedUrl(path, 300);
  if (r.error) throw r.error;
  window.open(r.data.signedUrl, "_blank", "noopener,noreferrer");
}
/** Nome do cliente da obra para as impressões (cadastro, ou o nome do orçamento). */
export const workClientOptions = (id: string) =>
  queryOptions({
    queryKey: ["schedule-client", id],
    queryFn: async () => {
      const w = await supabase
        .from("work_registry")
        .select("client_id,linked_budget_id")
        .eq("id", id)
        .single();
      if (w.error) throw w.error;
      if (w.data.client_id) {
        const p = await supabase.from("people").select("name").eq("id", w.data.client_id).single();
        if (p.error) throw p.error;
        return p.data.name;
      }
      if (w.data.linked_budget_id) {
        const b = await supabase
          .from("budgets")
          .select("client_display")
          .eq("id", w.data.linked_budget_id)
          .single();
        if (b.error) throw b.error;
        return b.data.client_display || "Não informado";
      }
      return "Não informado";
    },
  });

/** Materiais que o cliente entrega na obra (aba "Materiais do cliente" do cronograma). */
export const clientMaterialsOptions = (workId: string) =>
  queryOptions({
    queryKey: ["client-materials", workId],
    queryFn: async () => {
      const r = await supabase
        .from("work_client_materials")
        .select("*")
        .eq("work_id", workId)
        .order("due_date");
      if (r.error) throw r.error;
      return r.data;
    },
  });

/**
 * Dados financeiros e de identificação do cronograma físico-financeiro: contas a receber da obra
 * (pagamentos previstos) e o número do orçamento vinculado. Só admin/financeiro enxergam; para a
 * equipe as listas vêm vazias.
 */
export const scheduleFinanceOptions = (workId: string, budgetId: string | null, enabled: boolean) =>
  queryOptions({
    queryKey: ["schedule-finance", workId, budgetId, enabled],
    queryFn: async () => {
      if (!enabled) return { payments: [], budget: null };
      const [e, b] = await Promise.all([
        supabase
          .from("financial_entries")
          .select("due_date,amount,description")
          .eq("work_id", workId)
          .eq("direction", "entrada")
          .eq("canceled", false)
          .eq("cash_only", false)
          .order("due_date"),
        budgetId
          ? supabase.from("budgets").select("number,issue_date").eq("id", budgetId).single()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (e.error) throw e.error;
      if (b.error) throw b.error;
      return {
        payments: e.data.map((p) => ({
          date: p.due_date,
          // A descrição das entradas começa pelo rótulo da etapa de pagamento ("1ª medição · Obra").
          label: p.description.split(" · ")[0] || p.description,
          amount: Number(p.amount),
        })),
        budget: b.data,
      };
    },
  });

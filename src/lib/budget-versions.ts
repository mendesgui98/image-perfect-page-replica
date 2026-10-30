import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { apiFile } from "./api-client";

export type BudgetVersion = Database["public"]["Tables"]["budget_versions"]["Row"];

/** Campos do orçamento que não mudam o documento (situação, aprovação, auditoria). */
const VOLATILE = new Set([
  "status",
  "updated_at",
  "updated_by",
  "created_at",
  "created_by",
  "approval_date",
  "approval_path",
  "archived",
  "deleted_at",
  "deleted_by",
  "superseded_by",
  "refusal_reason",
]);

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !VOLATILE.has(k))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}

/**
 * Impressão digital do conteúdo do orçamento (dados, etapas, itens, preço e condições), sem
 * situação nem datas de edição: muda só quando algo que vai para o PDF ou para o preço muda.
 */
export function budgetFingerprint(content: {
  budget: object;
  sections: object[];
  items: object[];
}) {
  const text = JSON.stringify(stable(content));
  // FNV-1a de 64 bits: curto, estável e suficiente para comparar versões do mesmo orçamento.
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

/** Há alterações desde a última versão salva (ou nenhuma versão ainda)? */
export const hasUnsavedChanges = (
  versions: Pick<BudgetVersion, "fingerprint">[],
  fingerprint: string,
) => versions.at(-1)?.fingerprint !== fingerprint;

export const budgetVersionsOptions = (budgetId: string) =>
  queryOptions({
    queryKey: ["budget-versions", budgetId],
    queryFn: async () => {
      const r = await supabase
        .from("budget_versions")
        .select("*")
        .eq("budget_id", budgetId)
        .order("version");
      if (r.error) throw r.error;
      return r.data;
    },
  });

/** Gera o PDF oficial na API, guarda no bucket privado e registra a versão (número vem do banco). */
export async function saveBudgetVersion(budgetId: string, total: number, fingerprint: string) {
  const pdf = await apiFile("POST", `/v1/orcamentos/${budgetId}/pdf`, "Orcamento.pdf");
  const path = `budget-versions/${budgetId}/${crypto.randomUUID()}.pdf`;
  const up = await supabase.storage
    .from("jmg-documents")
    .upload(path, pdf.blob, { contentType: "application/pdf" });
  if (up.error) throw up.error;
  const r = await supabase
    .from("budget_versions")
    .insert({ budget_id: budgetId, file_path: path, total, fingerprint })
    .select()
    .single();
  if (r.error) throw r.error;
  return r.data;
}

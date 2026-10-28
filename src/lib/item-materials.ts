import type { Database } from "@/integrations/supabase/types";
import type { ItemMaterial } from "./pricing";

type CatalogMaterial = Database["public"]["Tables"]["materials"]["Row"];

/**
 * Copia um material do catálogo para o item do orçamento (snapshot): mudanças
 * futuras no catálogo não alteram orçamentos já montados.
 */
export function snapshotMaterial(m: CatalogMaterial, consumption = 1, loss_pct = 0): ItemMaterial {
  return {
    material_id: m.id,
    name: m.name,
    consumption_unit: m.consumption_unit,
    purchase_unit: m.purchase_unit,
    conversion: m.conversion,
    package_yield: m.rendimento_embalagem,
    yield_unit: m.unidade_rendimento,
    consumption: Number(consumption) || 0,
    loss_pct: Number(loss_pct) || 0,
    price: m.price,
    supplied_by: "jmg",
  };
}

export interface CustomItemDraft {
  description: string;
  unit: Database["public"]["Enums"]["service_unit"];
  quantity: number | string;
  labor_cost_unit: number | string;
  materials: { material_id: string; consumption: number | string; loss_pct: number | string }[];
}

export const emptyCustomItem = (): CustomItemDraft => ({
  description: "",
  unit: "un",
  quantity: 1,
  labor_cost_unit: 0,
  materials: [],
});

/** Monta os campos do item avulso (sem service_id) a partir do rascunho do diálogo. */
export function customItemFields(draft: CustomItemDraft, catalog: CatalogMaterial[]) {
  const description = draft.description.trim();
  if (!description) throw new Error("Informe a descrição do serviço avulso.");
  const quantity = Number(draft.quantity);
  const labor = Number(draft.labor_cost_unit) || 0;
  if (!(quantity >= 0) || labor < 0) throw new Error("Confira quantidade e custo.");
  const materials = draft.materials
    .filter((row) => row.material_id)
    .map((row) => {
      const m = catalog.find((x) => x.id === row.material_id);
      if (!m) throw new Error("Material não encontrado no catálogo.");
      return snapshotMaterial(m, Number(row.consumption), Number(row.loss_pct));
    });
  return {
    service_id: null,
    description,
    unit: draft.unit,
    quantity,
    labor_cost_unit: labor,
    materials,
  };
}

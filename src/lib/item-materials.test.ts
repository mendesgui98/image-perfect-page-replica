import { describe, it, expect } from "vitest";
import { customItemFields, emptyCustomItem, snapshotMaterial } from "./item-materials";
import { computeBudget, emptyParams } from "./pricing";

const salvaPiso = {
  id: "m1",
  name: "Salva-piso",
  purchase_unit: "Rolo",
  consumption_unit: "m²",
  conversion: 1,
  price: 80,
  rendimento_embalagem: 25,
  unidade_rendimento: "m²",
  active: true,
  supplier_id: null,
  reference: null,
  specs: null,
  price_updated_at: "2026-10-27",
  created_at: "",
  updated_at: "",
  created_by: null,
  updated_by: null,
};

describe("serviço avulso no orçamento", () => {
  it("copia o material do catálogo com rendimento e preço", () => {
    expect(snapshotMaterial(salvaPiso, 2, 10)).toEqual({
      material_id: "m1",
      name: "Salva-piso",
      consumption_unit: "m²",
      purchase_unit: "Rolo",
      conversion: 1,
      package_yield: 25,
      yield_unit: "m²",
      consumption: 2,
      loss_pct: 10,
      price: 80,
      supplied_by: "jmg",
    });
  });

  it("monta o item sem vínculo com o catálogo de serviços e calcula pelo pricing", () => {
    const fields = customItemFields(
      {
        description: "  Proteção da escada  ",
        unit: "m2",
        quantity: "30",
        labor_cost_unit: "10",
        materials: [
          { material_id: "m1", consumption: "1", loss_pct: "0" },
          { material_id: "", consumption: 1, loss_pct: 0 },
        ],
      },
      [salvaPiso],
    );
    expect(fields.service_id).toBeNull();
    expect(fields.description).toBe("Proteção da escada");
    expect(fields.materials).toHaveLength(1);
    // 30 m² → 2 rolos de R$ 80; MO 30 × R$ 10
    const r = computeBudget([fields], emptyParams);
    expect(r.materialsCost).toBe(160);
    expect(r.laborCost).toBe(300);
  });

  it("exige descrição", () => {
    expect(() => customItemFields(emptyCustomItem(), [salvaPiso])).toThrow(/descrição/);
  });

  it("recusa material que não está no catálogo", () => {
    expect(() =>
      customItemFields(
        {
          ...emptyCustomItem(),
          description: "X",
          materials: [{ material_id: "x", consumption: 1, loss_pct: 0 }],
        },
        [salvaPiso],
      ),
    ).toThrow(/catálogo/);
  });
});

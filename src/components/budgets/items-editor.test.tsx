import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { computeBudget, emptyParams, type ItemMaterial } from "@/lib/pricing";
import type { Item, Section } from "@/lib/budget-data";
import { ItemsEditor } from "./items-editor";

vi.mock("@/lib/budget-api", () => {
  const empty = (key: string) => ({ queryKey: [key], queryFn: async () => [] });
  return {
    stagesOptions: empty("stages"),
    activeServicesOptions: empty("services"),
    activeMaterialsOptions: empty("materials"),
    budgetApi: {},
  };
});

const material = (p: Partial<ItemMaterial>): ItemMaterial =>
  ({
    material_id: null,
    name: "",
    consumption: 1,
    consumption_unit: "kg",
    loss_pct: 0,
    price: 0,
    conversion: 1,
    purchase_unit: "un",
    package_yield: null,
    yield_unit: null,
    supplied_by: "jmg",
    ...p,
  }) as ItemMaterial;

const section = { id: "s1", title: "Pisos", materials_text: "" } as Section;
const item = {
  id: "i1",
  section_id: "s1",
  description: "Assentamento de piso",
  quantity: 40,
  unit: "m2",
  labor_cost_unit: 35,
  materials: [
    material({ name: "Argamassa", consumption: 4, loss_pct: 10, price: 32, package_yield: 20 }),
    material({ name: "Piso", price: 49.9, supplied_by: "cliente" }),
  ],
} as unknown as Item;

describe("ItemsEditor", () => {
  it("shows materials and labor per stage and per service", () => {
    const params = { ...emptyParams, model: "custo_direto" as const, desired_margin: 40 };
    const result = computeBudget([item], params);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ItemsEditor
          budgetId="b1"
          sections={[section]}
          items={[item]}
          result={result}
          locked
          params={params}
          onChange={() => {}}
        />
      </QueryClientProvider>,
    );
    // 176 kg de argamassa → 9 sacos de 20 kg × R$ 32 = R$ 288; o piso do cliente não entra.
    expect(screen.getAllByText("Materiais").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/288,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.400,00/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Materiais do serviço/ }));
    const table = screen.getByRole("table");
    expect(within(table).getByText("não entra")).toBeInTheDocument();
    expect(within(table).getByText("Total de materiais do serviço")).toBeInTheDocument();
  });
});

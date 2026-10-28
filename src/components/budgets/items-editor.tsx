import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronRight, Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  activeMaterialsOptions,
  activeServicesOptions,
  budgetApi,
  stagesOptions,
} from "@/lib/budget-api";
import {
  customItemFields,
  emptyCustomItem,
  snapshotMaterial,
  type CustomItemDraft,
} from "@/lib/item-materials";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { commitOnEnter } from "@/lib/enter-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Item, type Section } from "@/lib/budget-data";
import type { Database } from "@/integrations/supabase/types";
import {
  materialPackages,
  materialQty,
  type BudgetResult,
  type ItemMaterial,
  type PricingParams,
} from "@/lib/pricing";
import { fmtBRL, fmtNum, UNIT_LABEL } from "@/lib/format";
import { selectClass } from "@/components/works/fields";
import { EmptyState } from "@/components/feedback";
import { Money } from "@/components/kpi";

type CatalogMaterial = Database["public"]["Tables"]["materials"]["Row"];

export function ItemsEditor({
  budgetId,
  sections,
  items,
  result,
  locked,
  params,
  onChange,
}: {
  budgetId: string;
  sections: Section[];
  items: Item[];
  result: BudgetResult;
  locked: boolean;
  params: PricingParams;
  onChange: () => void;
}) {
  const { data: stages = [] } = useQuery(stagesOptions);
  const { data: services = [] } = useQuery(activeServicesOptions);
  const { data: catalog = [] } = useQuery(activeMaterialsOptions);
  const [stageId, setStageId] = useState("");
  const [picker, setPicker] = useState<Section | null>(null);
  const [svcId, setSvcId] = useState("");
  const [custom, setCustom] = useState<CustomItemDraft>(emptyCustomItem);
  const [adding, setAdding] = useState(false);

  const run = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (error) {
      toast.error((error as Error).message);
    }
    onChange();
  };

  async function addSection() {
    const st = stages.find((s) => s.id === stageId);
    await run(
      budgetApi.addSection({
        budget_id: budgetId,
        stage_id: st?.id ?? null,
        title: st ? st.name.toUpperCase() : "NOVA ETAPA",
        sort: (sections.at(-1)?.sort ?? 0) + 1,
      }),
    );
    setStageId("");
  }

  async function addItem(section: Section, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    const sort = items.filter((i) => i.section_id === section.id).length + 1;
    let fields;
    if (svc) {
      fields = {
        service_id: svc.id,
        description: svc.description,
        unit: svc.unit,
        quantity: 1,
        labor_cost_unit: svc.labor_cost,
        materials: svc.service_materials.flatMap((c) =>
          c.materials ? [snapshotMaterial(c.materials, c.consumption, c.loss_pct)] : [],
        ),
      };
    } else {
      // Serviço avulso: vale só para este orçamento, não entra no catálogo.
      try {
        fields = customItemFields(custom, catalog);
      } catch (error) {
        toast.error((error as Error).message);
        return;
      }
    }
    setAdding(true);
    await run(
      budgetApi.addItem({
        budget_id: budgetId,
        section_id: section.id,
        ...fields,
        materials: fields.materials as never,
        sort,
      }),
    );
    setAdding(false);
    setPicker(null);
    setSvcId("");
    setCustom(emptyCustomItem());
  }

  return (
    <div className="space-y-4">
      {sections.length === 0 && (
        <EmptyState icon={Layers} title="Adicione a primeira etapa da proposta." />
      )}
      {sections.map((s, idx) => (
        <SectionCard
          key={s.id}
          idx={idx + 1}
          section={s}
          items={items.filter((i) => i.section_id === s.id)}
          result={result}
          params={params}
          locked={locked}
          catalog={catalog}
          run={run}
          onAdd={() => setPicker(s)}
        />
      ))}
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <select
            className={`${selectClass} min-w-0 flex-1 sm:max-w-xs`}
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
          >
            <option value="">Etapa personalizada</option>
            {stages
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <Button variant="outline" onClick={addSection}>
            <Plus className="h-4 w-4" /> Adicionar etapa
          </Button>
        </div>
      )}

      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <SubmitForm onSubmit={() => picker && addItem(picker, svcId)} pending={adding}>
            <DialogHeader>
              <DialogTitle>Adicionar serviço</DialogTitle>
            </DialogHeader>
            <select
              className={selectClass}
              value={svcId}
              onChange={(e) => setSvcId(e.target.value)}
            >
              <option value="">Serviço avulso (só neste orçamento)</option>
              {services
                .filter((s) => !picker?.stage_id || s.stage_id === picker.stage_id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.description} — {UNIT_LABEL[s.unit]}
                  </option>
                ))}
            </select>
            {!svcId && <CustomItemFields draft={custom} setDraft={setCustom} catalog={catalog} />}
            <p className="text-xs text-muted-foreground">
              {svcId
                ? "Os custos e a composição são copiados para o orçamento. Mudanças futuras no catálogo não alteram este item."
                : "O serviço avulso fica só neste orçamento e não é cadastrado na tela de Serviços. Os materiais vêm do catálogo."}
            </p>
            <DialogFooter>
              <Button type="submit" disabled={adding}>
                Adicionar
              </Button>
            </DialogFooter>
          </SubmitForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionCard({
  idx,
  section,
  items,
  result,
  params,
  locked,
  catalog,
  run,
  onAdd,
}: {
  idx: number;
  section: Section;
  items: Item[];
  result: BudgetResult;
  params: PricingParams;
  locked: boolean;
  catalog: CatalogMaterial[];
  run: (p: Promise<unknown>) => Promise<void>;
  onAdd: () => void;
}) {
  const total = items.reduce(
    (s, i) => s + (result.items.find((r) => r.id === i.id)?.total ?? 0),
    0,
  );
  function autoMaterials() {
    const names = Array.from(
      new Set(
        items
          .flatMap((i) => i.materials.filter((m) => m.supplied_by === "jmg").map((m) => m.name))
          .filter(Boolean),
      ),
    );
    if (!names.length) {
      toast.info("Nenhum material da JMG nesta etapa.");
      return;
    }
    run(budgetApi.updateSection(section.id, { materials_text: names.join(", ") + "." }));
  }
  return (
    <Card className="shadow-card">
      <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft font-display text-sm font-bold text-primary">
          {idx}
        </span>
        <Input
          onKeyDown={commitOnEnter}
          className="min-w-0 flex-1 basis-40 border-transparent bg-transparent px-2 font-display font-bold uppercase shadow-none hover:border-input disabled:opacity-100"
          defaultValue={section.title}
          disabled={locked}
          onBlur={(e) =>
            e.target.value !== section.title &&
            run(budgetApi.updateSection(section.id, { title: e.target.value }))
          }
        />
        <Money value={total} className="ml-auto text-base font-semibold" />
        {!locked && (
          <Button
            type="button"
            variant="danger"
            size="icon"
            aria-label="Excluir etapa"
            onClick={() =>
              confirm("Excluir esta etapa e seus itens?") &&
              run(budgetApi.deleteSection(section.id))
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="divide-y divide-border/60">
          {items.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              r={result.items.find((x) => x.id === it.id)}
              params={params}
              locked={locked}
              catalog={catalog}
              run={run}
            />
          ))}
        </div>
        {!locked && (
          <Button type="button" size="sm" variant="soft" className="mt-2" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Serviço
          </Button>
        )}
        <div className="mt-4 space-y-1.5 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">
              Materiais inclusos (texto do PDF)
            </Label>
            {!locked && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={autoMaterials}
              >
                Gerar a partir dos itens
              </button>
            )}
          </div>
          <Textarea
            key={section.materials_text ?? ""}
            defaultValue={section.materials_text ?? ""}
            disabled={locked}
            rows={2}
            className="bg-card"
            onBlur={(e) =>
              e.target.value !== (section.materials_text ?? "") &&
              run(budgetApi.updateSection(section.id, { materials_text: e.target.value }))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item,
  r,
  params,
  locked,
  catalog,
  run,
}: {
  item: Item;
  r?: BudgetResult["items"][number] | undefined;
  params: PricingParams;
  locked: boolean;
  catalog: CatalogMaterial[];
  run: (p: Promise<unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState("");
  const upd = (p: Record<string, unknown>) => run(budgetApi.updateItem(item.id, p));
  const num = (v: string) => (v === "" ? null : Number(v));
  const setMat = (i: number, p: Partial<ItemMaterial>) =>
    upd({ materials: item.materials.map((m, j) => (j === i ? { ...m, ...p } : m)) });

  return (
    <div className="py-4">
      <div className="grid grid-cols-12 gap-2">
        <Textarea
          rows={1}
          className="col-span-12 min-h-10 md:col-span-6"
          defaultValue={item.description}
          disabled={locked}
          onBlur={(e) =>
            e.target.value !== item.description && upd({ description: e.target.value })
          }
        />
        <div className="col-span-4 md:col-span-2">
          <Input
            onKeyDown={commitOnEnter}
            type="number"
            step="any"
            defaultValue={item.quantity}
            disabled={locked}
            onBlur={(e) =>
              Number(e.target.value) !== item.quantity && upd({ quantity: Number(e.target.value) })
            }
          />
          <div className="mt-0.5 text-xs text-muted-foreground">{UNIT_LABEL[item.unit]}</div>
        </div>
        <div className="col-span-4 md:col-span-2">
          <Input
            onKeyDown={commitOnEnter}
            type="number"
            step="0.01"
            defaultValue={item.labor_cost_unit}
            disabled={locked}
            onBlur={(e) =>
              Number(e.target.value) !== item.labor_cost_unit &&
              upd({ labor_cost_unit: Number(e.target.value) })
            }
          />
          <div className="mt-0.5 text-xs text-muted-foreground">custo MO / un</div>
        </div>
        <div className="col-span-4 text-right md:col-span-2">
          <Money value={r?.total ?? 0} className="font-semibold" />
          <div className="text-xs text-muted-foreground num">
            custo {fmtBRL((r?.laborCost ?? 0) + (r?.materialsCost ?? 0))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="flex min-h-8 items-center gap-1 text-xs font-medium text-primary hover:underline"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Materiais ({item.materials.length}), percentuais e desconto
        </button>
        {!locked && (
          <Button
            type="button"
            size="sm"
            variant="danger"
            className="ml-auto"
            onClick={() => run(budgetApi.deleteItem(item.id))}
          >
            Remover
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-muted/40 p-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Unidade</Label>
              <select
                className={selectClass}
                value={item.unit}
                disabled={locked}
                onChange={(e) => upd({ unit: e.target.value })}
              >
                {Object.entries(UNIT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">
                Acréscimo MO % (padrão {fmtNum(params.labor_markup)})
              </Label>
              <Input
                onKeyDown={commitOnEnter}
                type="number"
                step="any"
                placeholder="padrão"
                defaultValue={item.labor_markup_override ?? ""}
                disabled={locked}
                onBlur={(e) => upd({ labor_markup_override: num(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">
                Acréscimo mat. % (padrão {fmtNum(params.materials_markup)})
              </Label>
              <Input
                onKeyDown={commitOnEnter}
                type="number"
                step="any"
                placeholder="padrão"
                defaultValue={item.materials_markup_override ?? ""}
                disabled={locked}
                onBlur={(e) => upd({ materials_markup_override: num(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Desconto neste item (R$)</Label>
              <Input
                onKeyDown={commitOnEnter}
                type="number"
                step="0.01"
                defaultValue={item.item_discount}
                disabled={locked}
                onBlur={(e) =>
                  Number(e.target.value) !== item.item_discount &&
                  upd({ item_discount: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          {item.materials.map((m, i) => (
            <div
              key={i}
              className="grid grid-cols-12 items-end gap-2 border-t border-border/60 pt-3"
            >
              <div className="col-span-12 text-sm font-medium sm:col-span-4">
                {m.name}
                <div className="text-xs text-muted-foreground">
                  <MaterialConsumption material={m} quantity={item.quantity} />
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Consumo/un</Label>
                <Input
                  onKeyDown={commitOnEnter}
                  type="number"
                  step="any"
                  defaultValue={m.consumption}
                  disabled={locked}
                  onBlur={(e) =>
                    Number(e.target.value) !== m.consumption &&
                    setMat(i, { consumption: Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Perda %</Label>
                <Input
                  onKeyDown={commitOnEnter}
                  type="number"
                  step="any"
                  defaultValue={m.loss_pct}
                  disabled={locked}
                  onBlur={(e) =>
                    Number(e.target.value) !== m.loss_pct &&
                    setMat(i, { loss_pct: Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Preço compra</Label>
                <Input
                  onKeyDown={commitOnEnter}
                  type="number"
                  step="0.01"
                  defaultValue={m.price}
                  disabled={locked}
                  onBlur={(e) =>
                    Number(e.target.value) !== m.price &&
                    setMat(i, { price: Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-12 sm:col-span-2">
                <Label className="text-xs">Fornece</Label>
                <select
                  className={selectClass}
                  value={m.supplied_by}
                  disabled={locked}
                  onChange={(e) => setMat(i, { supplied_by: e.target.value as "jmg" | "cliente" })}
                >
                  <option value="jmg">JMG</option>
                  <option value="cliente">Cliente</option>
                </select>
              </div>
              {!locked && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  className="col-span-12 justify-self-end"
                  onClick={() => upd({ materials: item.materials.filter((_, j) => j !== i) })}
                >
                  Remover material
                </Button>
              )}
            </div>
          ))}
          {!locked && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={`${selectClass} min-w-0 flex-1 bg-card sm:max-w-sm`}
                aria-label="Material do catálogo"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
              >
                <option value="">Escolha um material do catálogo</option>
                {catalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.purchase_unit ? ` (${m.purchase_unit})` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={!newMaterial}
                onClick={() => {
                  const m = catalog.find((x) => x.id === newMaterial);
                  if (!m) return;
                  setNewMaterial("");
                  upd({ materials: [...item.materials, snapshotMaterial(m)] });
                }}
              >
                <Plus className="h-4 w-4" /> Material
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Dados ---------------- */

function MaterialConsumption({
  material: m,
  quantity,
}: {
  material: ItemMaterial;
  quantity: number;
}) {
  const needed = materialQty(m, quantity);
  const packages = materialPackages(m, quantity);
  if (packages === null)
    return (
      <>
        {fmtNum(needed)} {m.consumption_unit} ≈ {fmtNum(needed / (m.conversion || 1))}{" "}
        {m.purchase_unit}
      </>
    );
  return (
    <>
      {fmtNum(needed)} {m.yield_unit || m.consumption_unit} → {packages} {m.purchase_unit}{" "}
      <span className="whitespace-nowrap">
        (embalagem de {fmtNum(m.package_yield)} {m.yield_unit || m.consumption_unit})
      </span>
    </>
  );
}

function CustomItemFields({
  draft,
  setDraft,
  catalog,
}: {
  draft: CustomItemDraft;
  setDraft: (d: CustomItemDraft) => void;
  catalog: CatalogMaterial[];
}) {
  const setRow = (i: number, p: Partial<CustomItemDraft["materials"][number]>) =>
    setDraft({
      ...draft,
      materials: draft.materials.map((row, j) => (j === i ? { ...row, ...p } : row)),
    });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-4">
          <Label>Descrição do serviço</Label>
          <Input
            autoFocus
            placeholder="ex.: Instalação de prateleira de vidro"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>Unidade</Label>
          <select
            className={selectClass}
            value={draft.unit}
            onChange={(e) =>
              setDraft({ ...draft, unit: e.target.value as CustomItemDraft["unit"] })
            }
          >
            {Object.entries(UNIT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Quantidade</Label>
          <Input
            type="number"
            step="any"
            min="0"
            value={draft.quantity}
            onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Custo MO / unidade (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={draft.labor_cost_unit}
            onChange={(e) => setDraft({ ...draft, labor_cost_unit: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Materiais por unidade do serviço</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                materials: [...draft.materials, { material_id: "", consumption: 1, loss_pct: 0 }],
              })
            }
          >
            <Plus className="h-4 w-4" /> Material
          </Button>
        </div>
        {draft.materials.length === 0 && (
          <p className="text-xs text-muted-foreground">Sem materiais.</p>
        )}
        {draft.materials.map((row, i) => {
          const m = catalog.find((x) => x.id === row.material_id);
          return (
            <div key={i} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-12 sm:col-span-6">
                <select
                  className={selectClass}
                  aria-label="Material"
                  value={row.material_id}
                  onChange={(e) => setRow(i, { material_id: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {catalog.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                      {x.purchase_unit ? ` (${x.purchase_unit})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-5 sm:col-span-3">
                <Label className="text-xs">
                  Consumo {m?.consumption_unit ? `(${m.consumption_unit})` : ""}
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={row.consumption}
                  onChange={(e) => setRow(i, { consumption: e.target.value })}
                />
              </div>
              <div className="col-span-5 sm:col-span-2">
                <Label className="text-xs">Perda %</Label>
                <Input
                  type="number"
                  step="any"
                  value={row.loss_pct}
                  onChange={(e) => setRow(i, { loss_pct: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="col-span-2 sm:col-span-1"
                aria-label="Remover material"
                onClick={() =>
                  setDraft({ ...draft, materials: draft.materials.filter((_, j) => j !== i) })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

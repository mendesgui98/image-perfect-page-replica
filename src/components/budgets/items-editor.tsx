import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { activeServicesOptions, budgetApi, stagesOptions } from "@/lib/budget-api";
import { Button } from "@/components/ui/button";
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
import {
  materialQty,
  type BudgetResult,
  type ItemMaterial,
  type PricingParams,
} from "@/lib/pricing";
import { fmtBRL, fmtNum, UNIT_LABEL } from "@/lib/format";
import { selectClass } from "@/components/works/fields";

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
  const [stageId, setStageId] = useState("");
  const [picker, setPicker] = useState<Section | null>(null);
  const [svcId, setSvcId] = useState("");

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
    const materials: ItemMaterial[] =
      svc?.service_materials.map((c) => ({
        material_id: c.material_id,
        name: c.materials?.name ?? "",
        consumption_unit: c.materials?.consumption_unit ?? "",
        purchase_unit: c.materials?.purchase_unit ?? "",
        conversion: c.materials?.conversion ?? 1,
        consumption: c.consumption,
        loss_pct: c.loss_pct,
        price: c.materials?.price ?? 0,
        supplied_by: "jmg",
      })) ?? [];
    await run(
      budgetApi.addItem({
        budget_id: budgetId,
        section_id: section.id,
        service_id: svc?.id ?? null,
        description: svc?.description ?? "Novo serviço",
        unit: svc?.unit ?? "un",
        quantity: 1,
        labor_cost_unit: svc?.labor_cost ?? 0,
        materials: materials as never,
        sort: items.filter((i) => i.section_id === section.id).length + 1,
      }),
    );
    setPicker(null);
    setSvcId("");
  }

  return (
    <div className="space-y-4">
      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Adicione a primeira etapa da proposta.
        </p>
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
          run={run}
          onAdd={() => setPicker(s)}
        />
      ))}
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <select
            className={`${selectClass} max-w-xs`}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar serviço</DialogTitle>
          </DialogHeader>
          <select className={selectClass} value={svcId} onChange={(e) => setSvcId(e.target.value)}>
            <option value="">Item manual (sem catálogo)</option>
            {services
              .filter((s) => !picker?.stage_id || s.stage_id === picker.stage_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.description} — {UNIT_LABEL[s.unit]}
                </option>
              ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Os custos e a composição são copiados para o orçamento. Mudanças futuras no catálogo não
            alteram este item.
          </p>
          <DialogFooter>
            <Button onClick={() => picker && addItem(picker, svcId)}>Adicionar</Button>
          </DialogFooter>
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
  run,
  onAdd,
}: {
  idx: number;
  section: Section;
  items: Item[];
  result: BudgetResult;
  params: PricingParams;
  locked: boolean;
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
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <span className="font-display font-bold text-primary">{idx}.</span>
        <Input
          className="font-display font-bold uppercase"
          defaultValue={section.title}
          disabled={locked}
          onBlur={(e) =>
            e.target.value !== section.title &&
            run(budgetApi.updateSection(section.id, { title: e.target.value }))
          }
        />
        <span className="whitespace-nowrap text-sm font-semibold num">{fmtBRL(total)}</span>
        {!locked && (
          <Button
            variant="ghost"
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
      <CardContent className="space-y-3">
        {items.map((it) => (
          <ItemRow
            key={it.id}
            item={it}
            r={result.items.find((x) => x.id === it.id)}
            params={params}
            locked={locked}
            run={run}
          />
        ))}
        {!locked && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Serviço
          </Button>
        )}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-between">
            <Label>Materiais inclusos (texto do PDF)</Label>
            {!locked && (
              <button className="text-xs text-primary hover:underline" onClick={autoMaterials}>
                Gerar a partir dos itens
              </button>
            )}
          </div>
          <Textarea
            key={section.materials_text ?? ""}
            defaultValue={section.materials_text ?? ""}
            disabled={locked}
            rows={2}
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
  run,
}: {
  item: Item;
  r?: BudgetResult["items"][number] | undefined;
  params: PricingParams;
  locked: boolean;
  run: (p: Promise<unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const upd = (p: Record<string, unknown>) => run(budgetApi.updateItem(item.id, p));
  const num = (v: string) => (v === "" ? null : Number(v));
  const setMat = (i: number, p: Partial<ItemMaterial>) =>
    upd({ materials: item.materials.map((m, j) => (j === i ? { ...m, ...p } : m)) });

  return (
    <div className="rounded-md border bg-background p-3">
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
          <div className="font-semibold num">{fmtBRL(r?.total)}</div>
          <div className="text-xs text-muted-foreground num">
            custo {fmtBRL((r?.laborCost ?? 0) + (r?.materialsCost ?? 0))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          className="flex items-center gap-1 text-xs text-primary"
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
          <button
            className="ml-auto text-xs text-destructive hover:underline"
            onClick={() => run(budgetApi.deleteItem(item.id))}
          >
            Remover
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t pt-3 text-sm">
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
            <div key={i} className="grid grid-cols-12 items-end gap-2 rounded bg-muted/50 p-2">
              <div className="col-span-12 text-sm font-medium sm:col-span-4">
                {m.name}
                <div className="text-xs text-muted-foreground">
                  {fmtNum(materialQty(m, item.quantity))} {m.consumption_unit} ≈{" "}
                  {fmtNum(materialQty(m, item.quantity) / (m.conversion || 1))} {m.purchase_unit}
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Consumo/un</Label>
                <Input
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Dados ---------------- */

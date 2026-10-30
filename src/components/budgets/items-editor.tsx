import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Layers, Plus, Search, Trash2 } from "lucide-react";
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
  materialCost,
  materialPackages,
  materialQty,
  type BudgetResult,
  type ItemMaterial,
  type PricingParams,
  isDirectCostModel,
} from "@/lib/pricing";
import { fmtBRL, fmtNum, UNIT_LABEL } from "@/lib/format";
import { selectClass } from "@/components/works/fields";
import { EmptyState } from "@/components/feedback";
import { Money } from "@/components/kpi";
import { cn } from "@/lib/utils";

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
  // Etapas abertas (recolher/expandir), lembradas neste aparelho por orçamento.
  const storeKey = `jmg-budget-open:${budgetId}`;
  const [open, setOpen] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) return new Set(JSON.parse(saved) as string[]);
    } catch {
      /* sem armazenamento: começa com a primeira etapa aberta */
    }
    return new Set(sections[0] ? [sections[0].id] : []);
  });
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify([...open]));
    } catch {
      /* ignora */
    }
  }, [open, storeKey]);
  const [query, setQuery] = useState("");
  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const q = query.trim().toLowerCase();
  const matches = (i: Item) => !q || i.description.toLowerCase().includes(q);
  const shown = sections.filter(
    (s) =>
      !q ||
      s.title.toLowerCase().includes(q) ||
      items.some((i) => i.section_id === s.id && matches(i)),
  );
  const materialsCount = new Set(
    items.flatMap((i) => i.materials.map((m) => m.material_id ?? m.name)),
  ).size;

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
      <div className="rounded-2xl border border-border/70 bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
          <h2 className="font-semibold">Etapas e serviços</h2>
          <span className="text-xs text-muted-foreground">
            {sections.length} etapas · {items.length} serviços · {materialsCount} materiais
          </span>
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <label className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar serviço"
                placeholder="Buscar serviço..."
                className="h-8 w-full pl-8 text-sm sm:w-48"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOpen(new Set(sections.map((s) => s.id)))}
            >
              Expandir todas
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(new Set())}>
              Recolher todas
            </Button>
          </div>
        </div>
        {sections.length === 0 && (
          <EmptyState icon={Layers} title="Adicione a primeira etapa da proposta." />
        )}
        {q && !shown.length && (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum serviço encontrado.</p>
        )}
        <div className="divide-y divide-border/60">
          {shown.map((s) => (
            <SectionCard
              key={s.id}
              idx={sections.indexOf(s) + 1}
              section={s}
              items={items.filter(
                (i) =>
                  i.section_id === s.id && (!q || matches(i) || s.title.toLowerCase().includes(q)),
              )}
              result={result}
              params={params}
              locked={locked}
              catalog={catalog}
              run={run}
              open={!!q || open.has(s.id)}
              onToggle={() => toggle(s.id)}
              onAdd={() => setPicker(s)}
            />
          ))}
        </div>
        {!locked && (
          <div className="flex flex-wrap gap-2 border-t border-border/60 p-4">
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
      </div>

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
  open,
  onToggle,
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
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  const rows = items.map((i) => result.items.find((r) => r.id === i.id));
  const total = rows.reduce((s, r) => s + (r?.total ?? 0), 0);
  const materialsCost = rows.reduce((s, r) => s + (r?.materialsCost ?? 0), 0);
  const laborCost = rows.reduce((s, r) => s + (r?.laborCost ?? 0), 0);
  const materials = new Set(items.flatMap((i) => i.materials.map((m) => m.material_id ?? m.name)))
    .size;
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
    <section className={cn("border-l-4", open ? "border-l-primary" : "border-l-transparent")}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold",
            open ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary",
          )}
        >
          {idx}
        </span>
        <Input
          onKeyDown={commitOnEnter}
          className="min-w-0 flex-1 border-transparent bg-transparent px-2 font-display font-bold uppercase shadow-none hover:border-input disabled:opacity-100 sm:basis-40"
          defaultValue={section.title}
          disabled={locked}
          onBlur={(e) =>
            e.target.value !== section.title &&
            run(budgetApi.updateSection(section.id, { title: e.target.value }))
          }
        />
        <span className="flex items-center gap-1.5 text-xs">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium text-primary">
            {items.length} {items.length === 1 ? "serviço" : "serviços"}
          </span>
          {materials > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {materials} {materials === 1 ? "material" : "materiais"}
            </span>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-expanded={open}
          aria-label={open ? "Recolher etapa" : "Expandir etapa"}
          onClick={onToggle}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        {!locked && open && (
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
      </div>
      <StageSummary materials={materialsCost} labor={laborCost} price={total} />
      {open && (
        <div className="px-4 pb-4 sm:px-6">
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
          <div className="mt-3 flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={onToggle}>
              Recolher etapa <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Resumo da etapa: materiais, mão de obra, custo direto e preço de venda, com a proporção. */
function StageSummary({
  materials,
  labor,
  price,
}: {
  materials: number;
  labor: number;
  price: number;
}) {
  const cost = materials + labor;
  const materialsShare = cost > 0 ? Math.round((materials / cost) * 100) : 0;
  return (
    <div className="px-3 pb-3 sm:px-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border sm:grid-cols-4 [&>div]:min-w-0 [&>div]:px-3 [&>div]:py-2">
        <div>
          <SummaryLabel dot="bg-gold">Materiais</SummaryLabel>
          <Money value={materials} className="font-semibold" />
        </div>
        <div className="border-l">
          <SummaryLabel dot="bg-primary">Mão de obra</SummaryLabel>
          <Money value={labor} className="font-semibold" />
        </div>
        <div className="border-t sm:border-l sm:border-t-0">
          <SummaryLabel>Custo direto</SummaryLabel>
          <Money value={cost} className="font-semibold" />
        </div>
        <div className="border-l border-t bg-primary-soft sm:border-t-0">
          <SummaryLabel>Preço de venda</SummaryLabel>
          <Money value={price} className="text-base font-bold text-primary" />
        </div>
      </div>
      {cost > 0 && (
        <>
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="bg-gold" style={{ width: `${materialsShare}%` }} />
            <span className="flex-1 bg-primary" />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground num">
            <span>Materiais {materialsShare}%</span>
            <span>Mão de obra {100 - materialsShare}%</span>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryLabel({ dot, children }: { dot?: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {dot && <span className={cn("h-2 w-2 shrink-0 rounded-sm", dot)} />}
      {children}
    </span>
  );
}

/** Ficha do serviço: a conta montada do custo até o preço de venda. */
function ServiceCostSheet({
  item,
  r,
}: {
  item: Item;
  r?: BudgetResult["items"][number] | undefined;
}) {
  const materials = r?.materialsCost ?? 0;
  const labor = r?.laborCost ?? 0;
  return (
    <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3 text-sm num">
      <div className="flex justify-between gap-2">
        <SummaryLabel dot="bg-gold">Materiais</SummaryLabel>
        <Money value={materials} />
      </div>
      <div className="flex justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-x-1">
          <SummaryLabel dot="bg-primary">Mão de obra</SummaryLabel>
          <span className="text-xs text-muted-foreground">
            ({fmtNum(item.quantity)} × {fmtBRL(item.labor_cost_unit)})
          </span>
        </span>
        <Money value={labor} />
      </div>
      <div className="flex justify-between gap-2 border-t border-dashed pt-1.5 font-semibold">
        <span>Custo direto</span>
        <Money value={materials + labor} />
      </div>
      <div className="flex justify-between gap-2 border-t pt-1.5 font-bold text-primary">
        <span>Preço de venda</span>
        <Money value={r?.total ?? 0} className="text-base" />
      </div>
    </div>
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
  // Acréscimos e desconto por item só existem no cálculo antigo; no custo direto o preço é
  // formado no painel de precificação.
  const legacy = !isDirectCostModel(params);
  const upd = (p: Record<string, unknown>) => run(budgetApi.updateItem(item.id, p));
  const num = (v: string) => (v === "" ? null : Number(v));
  const setMat = (i: number, p: Partial<ItemMaterial>) =>
    upd({ materials: item.materials.map((m, j) => (j === i ? { ...m, ...p } : m)) });
  const cellInput = "h-8 w-20 text-right";

  return (
    <div className="space-y-3 py-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-2">
          <Textarea
            rows={1}
            className="min-h-10 font-medium"
            defaultValue={item.description}
            disabled={locked}
            onBlur={(e) =>
              e.target.value !== item.description && upd({ description: e.target.value })
            }
          />
          <div className="flex flex-wrap gap-3">
            <div className="w-32">
              <Label className="text-xs text-muted-foreground">
                Quantidade ({UNIT_LABEL[item.unit]})
              </Label>
              <Input
                onKeyDown={commitOnEnter}
                type="number"
                step="any"
                defaultValue={item.quantity}
                disabled={locked}
                onBlur={(e) =>
                  Number(e.target.value) !== item.quantity &&
                  upd({ quantity: Number(e.target.value) })
                }
              />
            </div>
            <div className="w-32">
              <Label className="text-xs text-muted-foreground">
                Custo MO / {UNIT_LABEL[item.unit]}
              </Label>
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
            </div>
          </div>
        </div>
        <ServiceCostSheet item={item} r={r} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex min-h-8 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Materiais do serviço{legacy && ", percentuais e desconto"}
          <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-foreground num">
            {item.materials.length} {item.materials.length === 1 ? "item" : "itens"} ·{" "}
            {fmtBRL(r?.materialsCost ?? 0)}
          </span>
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
        <div className="space-y-3 text-sm">
          <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-4">
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
            {legacy && (
              <>
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
              </>
            )}
          </div>
          {item.materials.length > 0 && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[44rem] text-sm num">
                <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                    <th>Material</th>
                    <th>Fornece</th>
                    <th className="text-right">Consumo / un</th>
                    <th className="text-right">Perda %</th>
                    <th>Quantidade</th>
                    <th className="text-right">Preço compra</th>
                    <th className="text-right">Total</th>
                    {!locked && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y [&_td]:px-3 [&_td]:py-2 [&_td]:align-middle">
                  {item.materials.map((m, i) => (
                    <tr key={i}>
                      <td className="font-medium">{m.name}</td>
                      <td>
                        <select
                          className={cn(selectClass, "h-8 w-24")}
                          aria-label="Quem fornece"
                          value={m.supplied_by}
                          disabled={locked}
                          onChange={(e) =>
                            setMat(i, { supplied_by: e.target.value as "jmg" | "cliente" })
                          }
                        >
                          <option value="jmg">JMG</option>
                          <option value="cliente">Cliente</option>
                        </select>
                      </td>
                      <td className="text-right">
                        <Input
                          onKeyDown={commitOnEnter}
                          type="number"
                          step="any"
                          aria-label="Consumo por unidade"
                          className={cn(cellInput, "ml-auto")}
                          defaultValue={m.consumption}
                          disabled={locked}
                          onBlur={(e) =>
                            Number(e.target.value) !== m.consumption &&
                            setMat(i, { consumption: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="text-right">
                        <Input
                          onKeyDown={commitOnEnter}
                          type="number"
                          step="any"
                          aria-label="Perda %"
                          className={cn(cellInput, "ml-auto w-16")}
                          defaultValue={m.loss_pct}
                          disabled={locked}
                          onBlur={(e) =>
                            Number(e.target.value) !== m.loss_pct &&
                            setMat(i, { loss_pct: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="text-xs text-muted-foreground">
                        <MaterialConsumption material={m} quantity={item.quantity} />
                      </td>
                      <td className="text-right">
                        <Input
                          onKeyDown={commitOnEnter}
                          type="number"
                          step="0.01"
                          aria-label="Preço de compra"
                          className={cn(cellInput, "ml-auto w-24")}
                          defaultValue={m.price}
                          disabled={locked}
                          onBlur={(e) =>
                            Number(e.target.value) !== m.price &&
                            setMat(i, { price: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold">
                        {m.supplied_by === "cliente" ? (
                          <span className="font-normal text-muted-foreground">não entra</span>
                        ) : (
                          fmtBRL(materialCost(m, item.quantity))
                        )}
                      </td>
                      {!locked && (
                        <td>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Remover material"
                            onClick={() =>
                              upd({ materials: item.materials.filter((_, j) => j !== i) })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gold-soft font-bold [&>td]:px-3 [&>td]:py-2">
                    <td colSpan={6}>Total de materiais do serviço</td>
                    <td className="whitespace-nowrap text-right">
                      {fmtBRL(r?.materialsCost ?? 0)}
                    </td>
                    {!locked && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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

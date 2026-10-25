import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Copy, FileDown, GitBranch, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { NoAccess } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { budgetKey, loadBudget, type Item, type Section, type Term } from "@/lib/budget-data";
import { computeBudget, materialQty, splitPayments, type BudgetResult, type ItemMaterial, type PricingParams } from "@/lib/pricing";
import { fmtBRL, fmtDate, fmtNum, fmtPct, UNIT_LABEL } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/budget-status";
import { Approval } from "@/components/works/approval";
import { Attachment } from "@/components/works/fields";

export const Route = createFileRoute("/_authenticated/orcamentos/$id/")({
  head: () => ({ meta: [{ title: "Orçamento — JMG Reformas" }] }),
  component: Editor,
});

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function Editor() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: budgetKey(id), queryFn: () => loadBudget(id), enabled: !!me?.canSeeCosts });
  const refresh = () => qc.invalidateQueries({ queryKey: budgetKey(id) });

  const result = useMemo(() => (data ? computeBudget(data.items, data.params, data.budget.general_discount) : null), [data]);

  const updBudget = useMutation({
    mutationFn: async (p: Record<string, unknown>) => {
      const { error } = await supabase.from("budgets").update(p as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });

  const copy = useMutation({
    mutationFn: async (asRevision: boolean) => {
      const { data: nid, error } = await supabase.rpc("copy_budget", { _budget_id: id, _as_revision: asRevision });
      if (error) throw error;
      return nid as string;
    },
    onSuccess: (nid, asRev) => {
      toast.success(asRev ? "Revisão criada." : "Proposta duplicada.");
      qc.invalidateQueries({ queryKey: ["budgets"] });
      navigate({ to: "/orcamentos/$id", params: { id: nid } });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (me && !me.canSeeCosts) return <NoAccess />;
  if (!data || !result) return <p className="text-muted-foreground">Carregando…</p>;
  const { budget } = data;
  const locked = budget.status === "aprovado" || budget.status === "recusado";

  async function setStatus(status: string) {
    if (!result) return;
    await updBudget.mutateAsync({ status });
    await supabase.from("budget_history").insert({ budget_id: id, action: `status:${status}`, summary: { total: result.saleNet } });
    toast.success(`Situação: ${STATUS_LABEL[status]}`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/orcamentos" className="text-sm text-muted-foreground hover:underline">
            ← Orçamentos
          </Link>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            Orçamento nº {budget.number}
            {budget.revision ? ` · Rev. ${budget.revision}` : ""}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">{STATUS_LABEL[budget.status]}</span>
            <span>{budget.client_display}</span>
            {locked && (
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Bloqueado — alterações por nova revisão
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => copy.mutate(false)}>
            <Copy className="h-4 w-4" /> Duplicar
          </Button>
          <Button variant="outline" onClick={() => copy.mutate(true)}>
            <GitBranch className="h-4 w-4" /> Nova revisão
          </Button>
          <Button asChild>
            <Link to="/orcamentos/$id/pdf" params={{ id }}>
              <FileDown className="h-4 w-4" /> Revisar PDF
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {budget.status === "elaboracao" && <Button size="sm" variant="secondary" onClick={() => setStatus("enviado")}>Marcar como enviado</Button>}
        {budget.status === "enviado" && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setStatus("elaboracao")}>Voltar para elaboração</Button>
            <Button size="sm" variant="secondary" onClick={() => setStatus("recusado")}>Marcar como recusado</Button>
          </>
        )}
        <Approval budgetId={id} status={budget.status} onChange={refresh} />
        <Attachment path={budget.approval_path} />
        {!budget.archived ? (
          <Button size="sm" variant="ghost" onClick={() => updBudget.mutate({ archived: true })}>Arquivar</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => updBudget.mutate({ archived: false })}>Desarquivar</Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Tabs defaultValue="itens">
          <TabsList>
            <TabsTrigger value="itens">Serviços</TabsTrigger>
            <TabsTrigger value="dados">Dados e condições</TabsTrigger>
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
          </TabsList>
          <TabsContent value="itens">
            <ItemsEditor budgetId={id} sections={data.sections} items={data.items} result={result} locked={locked} params={data.params} onChange={refresh} />
          </TabsContent>
          <TabsContent value="dados">
            <DadosEditor budget={budget} terms={data.terms} total={result.saleNet} locked={locked} onSave={(p) => updBudget.mutateAsync(p).then(() => toast.success("Salvo."))} />
          </TabsContent>
          <TabsContent value="materiais">
            <MaterialsSummary items={data.items} />
          </TabsContent>
        </Tabs>
        <PricingPanel budgetId={id} params={data.params} discount={budget.general_discount} items={data.items} result={result} locked={locked} onApplied={refresh} />
      </div>
    </div>
  );
}

/* ---------------- Itens ---------------- */

function ItemsEditor({
  budgetId, sections, items, result, locked, params, onChange,
}: { budgetId: string; sections: Section[]; items: Item[]; result: BudgetResult; locked: boolean; params: PricingParams; onChange: () => void }) {
  const { data: stages = [] } = useQuery({ queryKey: ["stages"], queryFn: async () => (await supabase.from("stages").select("*").order("sort")).data ?? [] });
  const { data: services = [] } = useQuery({
    queryKey: ["services-full"],
    queryFn: async () => (await supabase.from("services").select("*, service_materials(*, materials(*))").eq("active", true).order("description")).data ?? [],
  });
  const [stageId, setStageId] = useState("");
  const [picker, setPicker] = useState<Section | null>(null);
  const [svcId, setSvcId] = useState("");

  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    if (error) toast.error((error as Error).message);
    onChange();
  };

  async function addSection() {
    const st = stages.find((s) => s.id === stageId);
    await run(
      supabase.from("budget_sections").insert({
        budget_id: budgetId, stage_id: st?.id ?? null,
        title: st ? st.name.toUpperCase() : "NOVA ETAPA", sort: (sections.at(-1)?.sort ?? 0) + 1,
      }),
    );
    setStageId("");
  }

  async function addItem(section: Section, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    const materials: ItemMaterial[] =
      svc?.service_materials.map((c) => ({
        material_id: c.material_id, name: c.materials?.name ?? "", consumption_unit: c.materials?.consumption_unit ?? "",
        purchase_unit: c.materials?.purchase_unit ?? "", conversion: c.materials?.conversion ?? 1,
        consumption: c.consumption, loss_pct: c.loss_pct, price: c.materials?.price ?? 0, supplied_by: "jmg",
      })) ?? [];
    await run(
      supabase.from("budget_items").insert({
        budget_id: budgetId, section_id: section.id, service_id: svc?.id ?? null,
        description: svc?.description ?? "Novo serviço", unit: svc?.unit ?? "un", quantity: 1,
        labor_cost_unit: svc?.labor_cost ?? 0, materials: materials as never,
        sort: items.filter((i) => i.section_id === section.id).length + 1,
      }),
    );
    setPicker(null);
    setSvcId("");
  }

  return (
    <div className="space-y-4">
      {sections.length === 0 && <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Adicione a primeira etapa da proposta.</p>}
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
          <select className={`${sel} max-w-xs`} value={stageId} onChange={(e) => setStageId(e.target.value)}>
            <option value="">Etapa personalizada</option>
            {stages.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
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
          <select className={sel} value={svcId} onChange={(e) => setSvcId(e.target.value)}>
            <option value="">Item manual (sem catálogo)</option>
            {services
              .filter((s) => !picker?.stage_id || s.stage_id === picker.stage_id)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.description} — {UNIT_LABEL[s.unit]}</option>
              ))}
          </select>
          <p className="text-xs text-muted-foreground">Os custos e a composição são copiados para o orçamento. Mudanças futuras no catálogo não alteram este item.</p>
          <DialogFooter>
            <Button onClick={() => picker && addItem(picker, svcId)}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionCard({
  idx, section, items, result, params, locked, run, onAdd,
}: {
  idx: number; section: Section; items: Item[]; result: BudgetResult; params: PricingParams; locked: boolean;
  run: (p: PromiseLike<{ error: unknown }>) => Promise<void>; onAdd: () => void;
}) {
  const total = items.reduce((s, i) => s + (result.items.find((r) => r.id === i.id)?.total ?? 0), 0);
  function autoMaterials() {
    const names = Array.from(new Set(items.flatMap((i) => i.materials.filter((m) => m.supplied_by === "jmg").map((m) => m.name)).filter(Boolean)));
    if (!names.length) { toast.info("Nenhum material da JMG nesta etapa."); return; }
    run(supabase.from("budget_sections").update({ materials_text: names.join(", ") + "." }).eq("id", section.id));
  }
  return (
    <Card className="shadow-card">
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <span className="font-display font-bold text-primary">{idx}.</span>
        <Input
          className="font-display font-bold uppercase"
          defaultValue={section.title}
          disabled={locked}
          onBlur={(e) => e.target.value !== section.title && run(supabase.from("budget_sections").update({ title: e.target.value }).eq("id", section.id))}
        />
        <span className="whitespace-nowrap text-sm font-semibold num">{fmtBRL(total)}</span>
        {!locked && (
          <Button variant="ghost" size="icon" aria-label="Excluir etapa" onClick={() => confirm("Excluir esta etapa e seus itens?") && run(supabase.from("budget_sections").delete().eq("id", section.id))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => (
          <ItemRow key={it.id} item={it} r={result.items.find((x) => x.id === it.id)} params={params} locked={locked} run={run} />
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
            onBlur={(e) => e.target.value !== (section.materials_text ?? "") && run(supabase.from("budget_sections").update({ materials_text: e.target.value }).eq("id", section.id))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item, r, params, locked, run,
}: { item: Item; r?: BudgetResult["items"][number] | undefined; params: PricingParams; locked: boolean; run: (p: PromiseLike<{ error: unknown }>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const upd = (p: Record<string, unknown>) => run(supabase.from("budget_items").update(p as never).eq("id", item.id));
  const num = (v: string) => (v === "" ? null : Number(v));
  const setMat = (i: number, p: Partial<ItemMaterial>) => upd({ materials: item.materials.map((m, j) => (j === i ? { ...m, ...p } : m)) });

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="grid grid-cols-12 gap-2">
        <Textarea
          rows={1}
          className="col-span-12 min-h-10 md:col-span-6"
          defaultValue={item.description}
          disabled={locked}
          onBlur={(e) => e.target.value !== item.description && upd({ description: e.target.value })}
        />
        <div className="col-span-4 md:col-span-2">
          <Input type="number" step="any" defaultValue={item.quantity} disabled={locked} onBlur={(e) => Number(e.target.value) !== item.quantity && upd({ quantity: Number(e.target.value) })} />
          <div className="mt-0.5 text-xs text-muted-foreground">{UNIT_LABEL[item.unit]}</div>
        </div>
        <div className="col-span-4 md:col-span-2">
          <Input type="number" step="0.01" defaultValue={item.labor_cost_unit} disabled={locked} onBlur={(e) => Number(e.target.value) !== item.labor_cost_unit && upd({ labor_cost_unit: Number(e.target.value) })} />
          <div className="mt-0.5 text-xs text-muted-foreground">custo MO / un</div>
        </div>
        <div className="col-span-4 text-right md:col-span-2">
          <div className="font-semibold num">{fmtBRL(r?.total)}</div>
          <div className="text-xs text-muted-foreground num">custo {fmtBRL((r?.laborCost ?? 0) + (r?.materialsCost ?? 0))}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button className="flex items-center gap-1 text-xs text-primary" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Materiais ({item.materials.length}), percentuais e desconto
        </button>
        {!locked && (
          <button className="ml-auto text-xs text-destructive hover:underline" onClick={() => run(supabase.from("budget_items").delete().eq("id", item.id))}>
            Remover
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t pt-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Unidade</Label>
              <select className={sel} value={item.unit} disabled={locked} onChange={(e) => upd({ unit: e.target.value })}>
                {Object.entries(UNIT_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Acréscimo MO % (padrão {fmtNum(params.labor_markup)})</Label>
              <Input type="number" step="any" placeholder="padrão" defaultValue={item.labor_markup_override ?? ""} disabled={locked} onBlur={(e) => upd({ labor_markup_override: num(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Acréscimo mat. % (padrão {fmtNum(params.materials_markup)})</Label>
              <Input type="number" step="any" placeholder="padrão" defaultValue={item.materials_markup_override ?? ""} disabled={locked} onBlur={(e) => upd({ materials_markup_override: num(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Desconto neste item (R$)</Label>
              <Input type="number" step="0.01" defaultValue={item.item_discount} disabled={locked} onBlur={(e) => Number(e.target.value) !== item.item_discount && upd({ item_discount: Number(e.target.value) || 0 })} />
            </div>
          </div>
          {item.materials.map((m, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-2 rounded bg-muted/50 p-2">
              <div className="col-span-12 text-sm font-medium sm:col-span-4">
                {m.name}
                <div className="text-xs text-muted-foreground">
                  {fmtNum(materialQty(m, item.quantity))} {m.consumption_unit} ≈ {fmtNum(materialQty(m, item.quantity) / (m.conversion || 1))} {m.purchase_unit}
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Consumo/un</Label>
                <Input type="number" step="any" defaultValue={m.consumption} disabled={locked} onBlur={(e) => Number(e.target.value) !== m.consumption && setMat(i, { consumption: Number(e.target.value) })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Perda %</Label>
                <Input type="number" step="any" defaultValue={m.loss_pct} disabled={locked} onBlur={(e) => Number(e.target.value) !== m.loss_pct && setMat(i, { loss_pct: Number(e.target.value) })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Preço compra</Label>
                <Input type="number" step="0.01" defaultValue={m.price} disabled={locked} onBlur={(e) => Number(e.target.value) !== m.price && setMat(i, { price: Number(e.target.value) })} />
              </div>
              <div className="col-span-12 sm:col-span-2">
                <Label className="text-xs">Fornece</Label>
                <select className={sel} value={m.supplied_by} disabled={locked} onChange={(e) => setMat(i, { supplied_by: e.target.value as "jmg" | "cliente" })}>
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

function DadosEditor({
  budget, terms, total, locked, onSave,
}: { budget: NonNullable<Awaited<ReturnType<typeof loadBudget>>>["budget"]; terms: Term[]; total: number; locked: boolean; onSave: (p: Record<string, unknown>) => Promise<unknown> }) {
  const [f, setF] = useState(budget);
  const [t, setT] = useState<Term[]>(terms);
  useEffect(() => { setF(budget); setT(terms); }, [budget, terms]);
  const { rows, pctSum } = splitPayments(total, t);
  const field = (k: keyof typeof f, l: string, type = "text", span = "") => (
    <div className={`space-y-1 ${span}`}>
      <Label>{l}</Label>
      <Input type={type} disabled={locked} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );
  return (
    <Card className="shadow-card">
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {field("client_display", "Nome do cliente no documento", "text", "sm:col-span-2")}
          {field("endereco", "Endereço da obra", "text", "sm:col-span-2")}
          {field("bairro", "Bairro")}
          {field("cidade", "Cidade")}
          {field("uf", "UF")}
          {field("cep", "CEP")}
          {field("validity_date", "Validade da proposta", "date")}
          {field("estimated_term", "Prazo estimado")}
        </div>
        <div className="space-y-1">
          <Label>Observações</Label>
          <Textarea disabled={locked} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Exclusões (não inclusos)</Label>
          <Textarea disabled={locked} value={f.exclusions ?? ""} onChange={(e) => setF({ ...f, exclusions: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Texto de fechamento</Label>
          <Textarea rows={4} disabled={locked} value={f.closing_text ?? ""} onChange={(e) => setF({ ...f, closing_text: e.target.value })} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Condições de pagamento</h3>
            <span className={`text-sm num ${Math.abs(pctSum - 100) > 1e-9 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>Soma: {fmtNum(pctSum)}%</span>
          </div>
          <div className="space-y-2">
            {t.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-6" disabled={locked} value={row.label} onChange={(e) => setT(t.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Input className="col-span-2" type="number" step="any" disabled={locked} value={row.pct} onChange={(e) => setT(t.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} />
                <div className="col-span-3 self-center text-right text-sm num">{fmtBRL(rows[i]?.value)}</div>
                {!locked && (
                  <Button variant="ghost" size="icon" className="col-span-1" aria-label="Remover" onClick={() => setT(t.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!locked && (
              <Button size="sm" variant="outline" onClick={() => setT([...t, { label: "", pct: 0 }])}>
                <Plus className="h-4 w-4" /> Parcela
              </Button>
            )}
          </div>
        </div>
        <Button
          disabled={locked}
          onClick={() => {
            if (Math.abs(pctSum - 100) > 1e-9) { toast.error("As parcelas precisam somar 100%."); return; }
            const { client_display, endereco, bairro, cidade, uf, cep, validity_date, estimated_term, notes, exclusions, closing_text } = f;
            onSave(locked ? { client_display } : { client_display, endereco, bairro, cidade, uf, cep, validity_date: validity_date || null, estimated_term, notes, exclusions, closing_text, payment_terms: t });
          }}
        >
          Salvar dados
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- Materiais consolidados ---------------- */

function MaterialsSummary({ items }: { items: Item[] }) {
  const map = new Map<string, { name: string; unit: string; purchase: string; conv: number; qty: number; who: string }>();
  for (const it of items)
    for (const m of it.materials) {
      const key = `${m.material_id ?? m.name}|${m.supplied_by}`;
      const cur = map.get(key) ?? { name: m.name, unit: m.consumption_unit, purchase: m.purchase_unit, conv: m.conversion || 1, qty: 0, who: m.supplied_by };
      cur.qty += materialQty(m, it.quantity);
      map.set(key, cur);
    }
  const rows = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card className="shadow-card">
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="p-3">Material</th>
              <th className="p-3 text-right">Consumo</th>
              <th className="p-3 text-right">Em unid. de compra</th>
              <th className="p-3">Fornece</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name + r.who} className="border-t">
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-right num">{fmtNum(r.qty)} {r.unit}</td>
                <td className="p-3 text-right num">{Math.ceil(r.qty / r.conv - 1e-9)} {r.purchase}</td>
                <td className="p-3">{r.who === "jmg" ? "JMG" : "Cliente"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem materiais nos itens.</td></tr>
            )}
          </tbody>
        </table>
        <p className="p-3 text-xs text-muted-foreground">Previsão consolidada. Pedidos, recebimentos e saldo a comprar chegam na Etapa 3.</p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Precificação ---------------- */

const PARAM_FIELDS: [keyof PricingParams, string][] = [
  ["labor_markup", "Acréscimo MO (% s/ custo)"],
  ["materials_markup", "Acréscimo mat. (% s/ custo)"],
  ["negotiation_reserve", "Reserva negociação (%)"],
  ["architect_commission", "Comissão arquiteta (% s/ MO)"],
  ["desired_margin", "Margem desejada (% s/ venda)"],
  ["min_margin", "Margem mínima (% s/ venda)"],
  ["reinvestment_share", "Reinvestimento (% do resultado)"],
];

function PricingPanel({
  budgetId, params, discount, items, result, locked, onApplied,
}: { budgetId: string; params: PricingParams; discount: number; items: Item[]; result: BudgetResult; locked: boolean; onApplied: () => void }) {
  const [draft, setDraft] = useState(params);
  const [disc, setDisc] = useState(discount);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { setDraft(params); setDisc(discount); }, [params, discount]);
  const sim = useMemo(() => computeBudget(items, draft, disc), [items, draft, disc]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(params) || disc !== discount;

  async function apply() {
    const { error } = await supabase.from("budgets").update({ params: draft as never, general_discount: disc }).eq("id", budgetId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("budget_history").insert({
      budget_id: budgetId, action: "precificacao",
      summary: { antes: { params, desconto: discount, total: result.saleNet, margem: result.margin }, depois: { params: draft, desconto: disc, total: sim.saleNet, margem: sim.margin } } as never,
    });
    toast.success("Precificação aplicada.");
    setConfirming(false);
    onApplied();
  }

  return (
    <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resultado interno</CardTitle>
          <p className="text-xs text-muted-foreground">Não aparece no documento do cliente.</p>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <Row l="Custo mão de obra (terceiros)" v={result.laborCost} />
          <Row l="Custo materiais (JMG)" v={result.materialsCost} />
          <Row l="Preço lista" v={result.listTotal} muted />
          <Row l="  dos quais reserva de negociação" v={result.reserveAmount} muted />
          <Row l="Descontos (itens + geral)" v={-result.totalDiscount} />
          <Row l="Venda mão de obra" v={result.laborNet} />
          <Row l="Venda materiais" v={result.materialsNet} />
          <Row l="Total ao cliente" v={result.saleNet} strong />
          {result.taxes.map((t) => (
            <Row key={t.name} l={`${t.name} (${fmtNum(t.rate)}% s/ ${t.base === "venda" ? "venda" : "MO"})`} v={-t.amount} />
          ))}
          <Row l="Comissão arquiteta (s/ MO líquida)" v={-result.commission} />
          <Row l="Resultado estimado" v={result.result} strong />
          <div className="flex justify-between">
            <span>Margem sobre a venda</span>
            <span className={`font-semibold num ${result.belowMin ? "text-destructive" : ""}`}>{fmtPct(result.margin)}</span>
          </div>
          <Row l="Destinação a reinvestimento" v={result.reinvestment} muted />
          <div className="mt-2 rounded bg-secondary p-2 text-xs text-secondary-foreground">
            Desconto adicional possível mantendo a margem mínima: <b className="num">{fmtBRL(result.maxExtraDiscount)}</b>
          </div>
          {result.belowMin && (
            <div className="flex gap-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Resultado abaixo da margem mínima configurada.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Percentuais deste orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PARAM_FIELDS.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <Label className="text-xs">{l}</Label>
              <Input className="h-8 w-24 text-right num" type="number" step="any" disabled={locked} value={draft[k] as number} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <Label className="text-xs">Desconto geral (R$)</Label>
            <Input className="h-8 w-28 text-right num" type="number" step="0.01" disabled={locked} value={disc} onChange={(e) => setDisc(Number(e.target.value) || 0)} />
          </div>
          <p className="text-xs text-muted-foreground">O desconto geral é distribuído proporcionalmente entre mão de obra e materiais. Custos originais não mudam.</p>
          {dirty && !locked && (
            <Button className="w-full" onClick={() => setConfirming(true)}>
              Revisar alteração
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar alteração de preço</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-left"></th><th className="text-right">Antes</th><th className="text-right">Depois</th></tr>
            </thead>
            <tbody className="num">
              {([
                ["Preço ao cliente", result.saleNet, sim.saleNet],
                ["Desconto", result.totalDiscount, sim.totalDiscount],
                ["Comissão", result.commission, sim.commission],
                ["Resultado", result.result, sim.result],
              ] as const).map(([l, a, b]) => (
                <tr key={l} className="border-t">
                  <td className="py-1.5">{l}</td>
                  <td className="text-right">{fmtBRL(a)}</td>
                  <td className="text-right font-semibold">{fmtBRL(b)}</td>
                </tr>
              ))}
              <tr className="border-t">
                <td className="py-1.5">Margem</td>
                <td className="text-right">{fmtPct(result.margin)}</td>
                <td className={`text-right font-semibold ${sim.belowMin ? "text-destructive" : ""}`}>{fmtPct(sim.margin)}</td>
              </tr>
            </tbody>
          </table>
          {sim.belowMin && (
            <div className="flex gap-2 rounded bg-destructive/10 p-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" /> O novo resultado fica abaixo da margem mínima.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDraft(params); setDisc(discount); setConfirming(false); }}>Descartar</Button>
            <Button onClick={apply}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ l, v, strong, muted }: { l: string; v: number; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? "border-t pt-1.5 font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span className="whitespace-pre">{l}</span>
      <span className="num">{fmtBRL(v)}</span>
    </div>
  );
}

export { fmtDate };

import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMe } from "@/hooks/use-me";
import { NoAccess, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtNum, UNIT_LABEL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { IconBubble, Money } from "@/components/kpi";
import { EmptyState } from "@/components/feedback";
import { selectClass } from "@/components/works/fields";
import { panelClass } from "@/lib/surface";
import { cn } from "@/lib/utils";
import { materialPackages, materialQty, materialUnitCost, type ItemMaterial } from "@/lib/pricing";

type Svc = Database["public"]["Tables"]["services"]["Row"];
type Mat = Database["public"]["Tables"]["materials"]["Row"];
type Comp = { id?: string; material_id: string; consumption: number; loss_pct: number };

const asItemMaterial = (m: Mat, c: Pick<Comp, "consumption" | "loss_pct">): ItemMaterial => ({
  material_id: m.id,
  name: m.name,
  consumption_unit: m.consumption_unit,
  purchase_unit: m.purchase_unit,
  conversion: m.conversion,
  consumption: Number(c.consumption) || 0,
  loss_pct: Number(c.loss_pct) || 0,
  price: m.price,
  supplied_by: "jmg",
  package_yield: m.rendimento_embalagem,
  yield_unit: m.unidade_rendimento,
});

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => pageMeta("Serviços", "Serviços, custos e composições de materiais da JMG."),
  component: Servicos,
});

function Servicos() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<(Partial<Svc> & { comp: Comp[] }) | null>(null);
  const [stageFilter, setStageFilter] = useState("");

  const { data: stages = [] } = useQuery({
    queryKey: ["stages"],
    queryFn: async () => (await supabase.from("stages").select("*").order("sort")).data ?? [],
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    enabled: !!me?.canSeeCosts,
    queryFn: async () => (await supabase.from("materials").select("*").order("name")).data ?? [],
  });
  const { data = [] } = useQuery({
    queryKey: ["services"],
    enabled: !!me?.canSeeCosts,
    queryFn: async () =>
      (await supabase.from("services").select("*, service_materials(*)").order("description"))
        .data ?? [],
  });

  const save = useMutation({
    mutationFn: async (s: NonNullable<typeof edit>) => {
      if (!s.description?.trim()) throw new Error("Informe a descrição.");
      const { comp, ...rest } = s;
      const payload = {
        description: rest.description!.trim(),
        stage_id: rest.stage_id || null,
        unit: rest.unit ?? "un",
        labor_cost: Number(rest.labor_cost) || 0,
        active: rest.active ?? true,
      };
      const { error } = await supabase.rpc("save_service_composition", {
        _id: rest.id ?? null,
        _data: payload,
        _composition: comp
          .filter((c) => c.material_id)
          .map((c) => ({
            material_id: c.material_id,
            consumption: Number(c.consumption) || 0,
            loss_pct: Number(c.loss_pct) || 0,
          })),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço salvo. Orçamentos existentes não são alterados.");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["services-full"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (me && !me.canSeeCosts) return <NoAccess />;
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name ?? "Sem etapa";
  const list = data.filter((s) => !stageFilter || s.stage_id === stageFilter);
  const matCost = (s: (typeof data)[number]) =>
    s.service_materials.reduce((acc, c) => {
      const m = materials.find((x) => x.id === c.material_id);
      if (!m) return acc;
      const im = asItemMaterial(m, c);
      return acc + materialQty(im, 1) * materialUnitCost(im);
    }, 0);

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle="Descrição, unidade de cobrança, custo do terceiro e composição de materiais por unidade."
        actions={
          <Button onClick={() => setEdit({ active: true, unit: "m2", comp: [] })}>
            <Plus className="h-4 w-4" /> Novo serviço
          </Button>
        }
      />
      <div className={cn(panelClass, "mb-4 p-3 shadow-none sm:p-4")}>
        <select
          aria-label="Filtrar por etapa"
          className={cn(selectClass, "sm:max-w-xs")}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">Todas as etapas</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {list.length === 0 ? (
        <EmptyState compact icon={Wrench} title="Nenhum serviço." />
      ) : (
        <div className={cn(panelClass, "divide-y divide-border/60 overflow-hidden")}>
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem] gap-4 bg-muted/40 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
            <span>Serviço</span>
            <span className="text-right">Custo MO / un</span>
            <span className="text-right">Custo mat. / un</span>
          </div>
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                "flex w-full cursor-pointer flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-muted/50 sm:px-5 md:grid md:grid-cols-[minmax(0,1fr)_8rem_8rem] md:items-center md:gap-4",
                !s.active && "opacity-60",
              )}
              onClick={() =>
                setEdit({
                  ...s,
                  comp: s.service_materials.map((c) => ({
                    id: c.id,
                    material_id: c.material_id,
                    consumption: c.consumption,
                    loss_pct: c.loss_pct,
                  })),
                })
              }
            >
              <span className="flex min-w-0 flex-1 items-start gap-3">
                <IconBubble icon={Wrench} tone="neutral" />
                <span className="min-w-0">
                  <span className="block font-medium leading-snug">{s.description}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{stageName(s.stage_id)}</span>
                    <span aria-hidden>·</span>
                    <span>{UNIT_LABEL[s.unit]}</span>
                    {!s.active && <Badge variant="neutral">Inativo</Badge>}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-5 gap-y-1 pl-12 md:contents">
                <span className="block md:text-right">
                  <span className="mr-1 text-xs text-muted-foreground md:hidden">Mão de obra</span>
                  <Money value={s.labor_cost} className="font-semibold" />
                </span>
                <span className="block text-sm text-muted-foreground md:text-right md:text-foreground">
                  <span className="mr-1 text-xs md:hidden">Materiais</span>
                  <Money value={matCost(s)} />
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <SubmitForm onSubmit={() => edit && save.mutate(edit)} pending={save.isPending}>
            <DialogHeader>
              <DialogTitle>{edit?.id ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            </DialogHeader>
            {edit && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Descrição (aparece no orçamento)</Label>
                    <Input
                      value={edit.description ?? ""}
                      onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Etapa</Label>
                    <select
                      className={selectClass}
                      value={edit.stage_id ?? ""}
                      onChange={(e) => setEdit({ ...edit, stage_id: e.target.value })}
                    >
                      <option value="">—</option>
                      {stages
                        .filter((s) => s.active || s.id === edit.stage_id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Cobrança por</Label>
                    <select
                      className={selectClass}
                      value={edit.unit ?? "un"}
                      onChange={(e) => setEdit({ ...edit, unit: e.target.value as Svc["unit"] })}
                    >
                      {Object.entries(UNIT_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Custo do terceiro por unidade (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={edit.labor_cost ?? ""}
                      onChange={(e) =>
                        setEdit({ ...edit, labor_cost: e.target.value as unknown as number })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <Switch
                      checked={edit.active ?? true}
                      onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                    />{" "}
                    Ativo
                  </label>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Composição por unidade do serviço</h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEdit({
                          ...edit,
                          comp: [...edit.comp, { material_id: "", consumption: 1, loss_pct: 0 }],
                        })
                      }
                    >
                      <Plus className="h-4 w-4" /> Material
                    </Button>
                  </div>
                  {edit.comp.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sem materiais.</p>
                  )}
                  <div className="space-y-2">
                    {edit.comp.map((c, i) => {
                      const m = materials.find((x) => x.id === c.material_id);
                      const set = (p: Partial<Comp>) =>
                        setEdit({
                          ...edit,
                          comp: edit.comp.map((x, j) => (j === i ? { ...x, ...p } : x)),
                        });
                      return (
                        <div
                          key={i}
                          className="grid grid-cols-12 items-end gap-2 rounded-xl bg-muted/40 p-3"
                        >
                          <div className="col-span-12 sm:col-span-6">
                            <select
                              className={selectClass}
                              value={c.material_id}
                              onChange={(e) => set({ material_id: e.target.value })}
                            >
                              <option value="">Selecione</option>
                              {materials
                                .filter((x) => x.active || x.id === c.material_id)
                                .map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name} ({x.consumption_unit})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="col-span-5 sm:col-span-3">
                            <Label className="text-xs">
                              Consumo {m ? `(${m.consumption_unit})` : ""}
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              value={c.consumption}
                              onChange={(e) =>
                                set({ consumption: e.target.value as unknown as number })
                              }
                            />
                          </div>
                          <div className="col-span-5 sm:col-span-2">
                            <Label className="text-xs">Perda %</Label>
                            <Input
                              type="number"
                              step="any"
                              value={c.loss_pct}
                              onChange={(e) =>
                                set({ loss_pct: e.target.value as unknown as number })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="danger"
                            size="icon"
                            className="col-span-2 sm:col-span-1"
                            aria-label="Remover"
                            onClick={() =>
                              setEdit({ ...edit, comp: edit.comp.filter((_, j) => j !== i) })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {m?.rendimento_embalagem ? (
                            <p className="col-span-12 text-xs text-muted-foreground">
                              Embalagem de {fmtNum(m.rendimento_embalagem, 4)}{" "}
                              {m.unidade_rendimento || m.consumption_unit}. Ex.: 100{" "}
                              {UNIT_LABEL[edit.unit ?? "un"]} →{" "}
                              {materialPackages(asItemMaterial(m, c), 100)} {m.purchase_unit}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEdit(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </SubmitForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}

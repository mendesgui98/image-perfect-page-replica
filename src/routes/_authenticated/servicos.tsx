import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { fmtBRL, fmtNum, UNIT_LABEL } from "@/lib/format";
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
      <select
        className="mb-4 h-10 rounded-md border border-input bg-background px-3 text-sm"
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
      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="p-3">Serviço</th>
              <th className="p-3">Etapa</th>
              <th className="p-3">Unidade</th>
              <th className="p-3 text-right">Custo MO / un</th>
              <th className="p-3 text-right">Custo mat. / un</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr
                key={s.id}
                className={`cursor-pointer border-t hover:bg-muted/50 ${s.active ? "" : "opacity-50"}`}
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
                <td className="p-3 font-medium">{s.description}</td>
                <td className="p-3">{stageName(s.stage_id)}</td>
                <td className="p-3">{UNIT_LABEL[s.unit]}</td>
                <td className="p-3 text-right num">{fmtBRL(s.labor_cost)}</td>
                <td className="p-3 text-right num">{fmtBRL(matCost(s))}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Nenhum serviço.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                    <h3 className="font-semibold">Composição por unidade do serviço</h3>
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
                        <div key={i} className="grid grid-cols-12 items-end gap-2">
                          <div className="col-span-12 sm:col-span-6">
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                            variant="ghost"
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

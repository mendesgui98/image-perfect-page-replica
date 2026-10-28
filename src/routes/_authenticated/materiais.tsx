import { businessDate } from "@/lib/dashboard-math";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMe } from "@/hooks/use-me";
import { NoAccess, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SubmitForm } from "@/components/enter-submit";
import { ConfirmRecordAction } from "@/components/management/confirm-record-action";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtDate, fmtNum } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { IconBubble, Money } from "@/components/kpi";
import { EmptyState } from "@/components/feedback";
import { selectClass } from "@/components/works/fields";
import { panelClass } from "@/lib/surface";
import { cn } from "@/lib/utils";

type Mat = Database["public"]["Tables"]["materials"]["Row"];

// Unidade gravada como símbolo: aparece direto em "100 m² → 4 rolos".
const UNITS = [
  { value: "m²", label: "m² (metro quadrado)" },
  { value: "m", label: "m (metro linear)" },
  { value: "Unid", label: "Unid (unidade)" },
];

export const Route = createFileRoute("/_authenticated/materiais")({
  head: () => pageMeta("Materiais", "Catálogo de materiais e composições da JMG."),
  component: Materiais,
});

function Materiais() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Mat> | null>(null);
  const [q, setQ] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["materials"],
    enabled: !!me?.canSeeCosts,
    queryFn: async () => (await supabase.from("materials").select("*").order("name")).data ?? [],
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["people", "fornecedor"],
    queryFn: async () =>
      (
        await supabase
          .from("people")
          .select("*")
          .is("deleted_at", null)
          .eq("kind", "fornecedor")
          .order("name")
      ).data ?? [],
  });
  const save = useMutation({
    mutationFn: async (m: Partial<Mat>) => {
      const missing = [
        !m.name?.trim() && "nome",
        !m.purchase_unit?.trim() && "unidade de compra",
        !m.consumption_unit?.trim() && "unidade de consumo",
      ].filter(Boolean);
      if (missing.length)
        throw new Error(
          `Preencha ${missing.join(", ").replace(/, ([^,]*)$/, " e $1")} para salvar.`,
        );
      const prev = data.find((x) => x.id === m.id);
      const payload = {
        ...m,
        conversion: Number(m.conversion) || 1,
        rendimento_embalagem:
          Number(m.rendimento_embalagem) > 0 ? Number(m.rendimento_embalagem) : null,
        unidade_rendimento: m.unidade_rendimento?.trim() || null,
        reference: m.reference?.trim() || null,
        specs: m.specs?.trim() || null,
        price: Number(m.price) || 0,
        price_updated_at:
          !prev || prev.price !== Number(m.price) ? businessDate() : m.price_updated_at,
      } as Mat;
      const { error } = m.id
        ? await supabase.from("materials").update(payload).eq("id", m.id)
        : await supabase.from("materials").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Material salvo. Orçamentos existentes não são alterados.");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (me && !me.canSeeCosts) return <NoAccess />;
  const term = q.toLowerCase();
  const list = data.filter((m) =>
    [m.name, m.reference, m.specs].some((v) => v?.toLowerCase().includes(term)),
  );

  return (
    <div>
      <PageHeader
        title="Materiais"
        subtitle="Unidade de compra, unidade de consumo e conversão. O histórico de preços é registrado."
        actions={
          <Button onClick={() => setEdit({ active: true, conversion: 1 })}>
            <Plus className="h-4 w-4" /> Novo material
          </Button>
        }
      />
      <div className={cn(panelClass, "mb-4 p-3 shadow-none sm:p-4")}>
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, referência ou especificação"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState compact icon={Package} title="Nenhum material cadastrado." />
      ) : (
        <div className={cn(panelClass, "divide-y divide-border/60 overflow-hidden")}>
          {list.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setEdit(m)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 sm:px-5",
                !m.active && "opacity-60",
              )}
            >
              <IconBubble icon={Package} tone="neutral" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium leading-snug">{m.name}</span>
                  {!m.active && <Badge variant="neutral">Inativo</Badge>}
                </span>
                {m.reference && (
                  <span className="block text-xs text-muted-foreground">{m.reference}</span>
                )}
                <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Compra: <span className="text-foreground">{m.purchase_unit}</span>
                  </span>
                  <span>
                    Consumo: <span className="text-foreground">{m.consumption_unit}</span> (×
                    {fmtNum(m.conversion, 4)})
                  </span>
                  {m.rendimento_embalagem ? (
                    <span>
                      Rendimento:{" "}
                      <span className="text-foreground">
                        {`${fmtNum(m.rendimento_embalagem, 4)} ${m.unidade_rendimento || m.consumption_unit}`}
                      </span>
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <Money value={m.price} className="font-semibold" />
                <span className="block text-xs text-muted-foreground">
                  {fmtDate(m.price_updated_at)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <SubmitForm onSubmit={() => edit && save.mutate(edit)} pending={save.isPending}>
            <DialogHeader>
              <DialogTitle>{edit?.id ? "Editar material" : "Novo material"}</DialogTitle>
            </DialogHeader>
            {edit && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nome</Label>
                  <Input
                    value={edit.name ?? ""}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Referência / fabricante</Label>
                  <Input
                    placeholder="ex.: Clamper Front 175V 45kA (cód. 014294)"
                    value={edit.reference ?? ""}
                    onChange={(e) => setEdit({ ...edit, reference: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Especificação técnica</Label>
                  <Textarea
                    rows={4}
                    placeholder="Corrente, tensão, seção de cabo, material, normas…"
                    value={edit.specs ?? ""}
                    onChange={(e) => setEdit({ ...edit, specs: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unidade de compra</Label>
                  <Input
                    placeholder="saco 20kg"
                    value={edit.purchase_unit ?? ""}
                    onChange={(e) => setEdit({ ...edit, purchase_unit: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unidade de consumo</Label>
                  <select
                    className={selectClass}
                    value={edit.consumption_unit ?? ""}
                    onChange={(e) => setEdit({ ...edit, consumption_unit: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    <UnitOptions current={edit.consumption_unit} />
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Conversão (consumo por 1 compra)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={edit.conversion ?? ""}
                    onChange={(e) =>
                      setEdit({ ...edit, conversion: e.target.value as unknown as number })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Preço por unidade de compra (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={edit.price ?? ""}
                    onChange={(e) =>
                      setEdit({ ...edit, price: e.target.value as unknown as number })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Rendimento da embalagem</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="ex.: 25 (rolo de 25 m²)"
                    value={edit.rendimento_embalagem ?? ""}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        rendimento_embalagem:
                          e.target.value === "" ? null : (e.target.value as unknown as number),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unidade do rendimento</Label>
                  <select
                    className={selectClass}
                    value={edit.unidade_rendimento ?? ""}
                    onChange={(e) =>
                      setEdit({ ...edit, unidade_rendimento: e.target.value || null })
                    }
                  >
                    <option value="">
                      Mesma do consumo{edit.consumption_unit ? ` (${edit.consumption_unit})` : ""}
                    </option>
                    <UnitOptions current={edit.unidade_rendimento} />
                  </select>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Com rendimento, o orçamento compra embalagens inteiras por serviço (ex.: 30 m² com
                  rolo de 25 m² = 2 rolos). Em branco, o custo é fracionado pela conversão.
                </p>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Fornecedor</Label>
                  <select
                    className={selectClass}
                    value={edit.supplier_id ?? ""}
                    onChange={(e) => setEdit({ ...edit, supplier_id: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={edit.active ?? true}
                    onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                  />{" "}
                  Ativo
                </label>
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
          {edit?.id && (
            // Fora do formulário: o envio da confirmação não pode disparar o Salvar.
            <div className="flex justify-start pt-1">
              <ConfirmRecordAction
                name={edit.name ?? "material"}
                description="O material sai do catálogo. Orçamentos e compras já lançados guardam uma cópia e não mudam. Se ele fizer parte da composição de algum serviço, a exclusão será bloqueada."
                onConfirm={async () => {
                  const { error } = await supabase.rpc("delete_material", { _id: edit.id! });
                  if (error) throw new Error(error.message);
                  toast.success("Material excluído.");
                  setEdit(null);
                  await qc.invalidateQueries({ queryKey: ["materials"] });
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Unidades selecionáveis; um valor antigo fora da lista continua como opção para não se perder.
function UnitOptions({ current }: { current: string | null | undefined }) {
  return (
    <>
      {UNITS.map((u) => (
        <option key={u.value} value={u.value}>
          {u.label}
        </option>
      ))}
      {current && !UNITS.some((u) => u.value === current) && (
        <option value={current}>{current}</option>
      )}
    </>
  );
}

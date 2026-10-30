import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clientMaterialsOptions } from "@/lib/work-data";
import { businessDate } from "@/lib/dashboard-math";
import { fmtDate } from "@/lib/format";
import { panelClass } from "@/lib/surface";
import { cn } from "@/lib/utils";
import type { ScheduleStage } from "@/lib/work-schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconBubble } from "@/components/kpi";
import { EmptyState, ListSkeleton } from "@/components/feedback";
import { selectClass } from "./fields";

// Aba "Materiais do cliente" do cronograma: o que o cliente precisa entregar na obra e até quando.
// As entregas aparecem nas folhas do cronograma físico-financeiro (marcador e quadro do período).

export function ClientMaterials({ workId, stages }: { workId: string; stages: ScheduleStage[] }) {
  const qc = useQueryClient();
  const { data: items, error, isLoading } = useQuery(clientMaterialsOptions(workId));
  const [stageId, setStageId] = useState(""),
    [description, setDescription] = useState(""),
    [due, setDue] = useState(""),
    [busy, setBusy] = useState(false);
  const ordered = [...stages].sort((a, b) => a.sort - b.sort);
  const name = new Map(ordered.map((s) => [s.id, s.name]));
  // Mesma numeração das folhas do cronograma, que só mostram etapas com datas.
  const number = new Map(ordered.filter((s) => s.planned_start).map((s, i) => [s.id, i + 1]));
  const label = (id: string) => {
    const n = number.get(id);
    return `${n ? `${String(n).padStart(2, "0")} · ` : ""}${name.get(id) ?? "Etapa removida"}`;
  };
  const today = businessDate();
  const refresh = () => qc.invalidateQueries({ queryKey: ["client-materials", workId] });

  async function add() {
    if (!description.trim() || !due || busy) return;
    setBusy(true);
    const r = await supabase.from("work_client_materials").insert({
      work_id: workId,
      stage_id: stageId || null,
      description: description.trim(),
      due_date: due,
    });
    setBusy(false);
    if (r.error) return void toast.error(r.error.message);
    setDescription("");
    setDue("");
    toast.success("Material incluído no cronograma.");
    await refresh();
  }
  async function toggle(id: string, delivered: boolean) {
    const r = await supabase.from("work_client_materials").update({ delivered }).eq("id", id);
    if (r.error) toast.error(r.error.message);
    await refresh();
  }
  async function remove(id: string) {
    const r = await supabase.from("work_client_materials").delete().eq("id", id);
    if (r.error) return void toast.error(r.error.message);
    toast.success("Material removido.");
    await refresh();
  }

  return (
    <section className={cn(panelClass, "space-y-4 p-4 sm:p-5")}>
      <div className="flex min-w-0 items-start gap-3">
        <IconBubble icon={PackageCheck} tone="brand" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Materiais do cliente</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            O que o cliente entrega na obra e até quando. Aparece no cronograma enviado ao cliente,
            na folha do período.
          </p>
        </div>
      </div>
      <form
        className="grid gap-2 sm:grid-cols-[1fr_1.4fr_10rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <select
          aria-label="Etapa do material"
          className={selectClass}
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
        >
          <option value="">Sem etapa</option>
          {ordered.map((s) => (
            <option key={s.id} value={s.id}>
              {label(s.id)}
            </option>
          ))}
        </select>
        <Input
          aria-label="Material"
          placeholder="Ex.: Porcelanatos, revestimentos e rodapés"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          aria-label="Entregar até"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <Button type="submit" disabled={!description.trim() || !due || busy}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error.message}
        </p>
      )}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !items?.length ? (
        <EmptyState
          title="Nenhum material do cliente"
          description="Inclua os materiais que o cliente vai comprar e entregar na obra."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Entregue</th>
                <th className="px-3 py-2 font-medium">Etapa</th>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Entregar até</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`${m.description} entregue`}
                      checked={m.delivered}
                      onChange={(e) => void toggle(m.id, e.target.checked)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {m.stage_id ? label(m.stage_id) : "Sem etapa"}
                  </td>
                  <td
                    className={cn("px-3 py-2", m.delivered && "text-muted-foreground line-through")}
                  >
                    {m.description}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2",
                      !m.delivered && m.due_date < today && "font-medium text-destructive",
                    )}
                  >
                    {fmtDate(m.due_date)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remover ${m.description}`}
                      onClick={() => void remove(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

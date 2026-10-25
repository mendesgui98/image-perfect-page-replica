import { useRecordFocus } from "@/hooks/use-record-focus";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadWorkBudget, workBase } from "@/lib/work-budget";
import { computeBudget, computeWorkResult } from "@/lib/pricing";
import { fmtBRL, fmtPct, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Field, Memo, text, number, Attachment } from "./fields";
import { uploadDocument } from "@/lib/work-data";
import { dashboardOptions } from "@/lib/dashboard-data";
import { financeOptions } from "./finance";
export function WorkResult({ workId, budgetId }: { workId: string; budgetId: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: f } = useQuery(financeOptions);
  const { data: dash } = useQuery(dashboardOptions);
  const { data, error } = useQuery({
    queryKey: ["work-result", workId],
    queryFn: async () => {
      const [b, x, o, e] = await Promise.all([
        loadWorkBudget(workId),
        supabase.from("work_extras").select("*").eq("work_id", workId),
        supabase.from("purchase_orders").select("*,purchase_lines(*)").eq("work_id", workId),
        supabase.from("work_estimates").select("*").eq("work_id", workId).maybeSingle(),
      ]);
      if (x.error) throw x.error;
      if (o.error) throw o.error;
      if (e.error) throw e.error;
      return { budget: b, extras: x.data, orders: o.data, estimate: e.data };
    },
  });
  const selectedRecord = useRecordFocus(data);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["work-result", workId] });
    qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
  };
  async function extra(d: FormData) {
    setBusy(true);
    try {
      const file = d.get("proof");
      const path = file instanceof File && file.size ? await uploadDocument(file, "extras") : null;
      const r = await supabase.from("work_extras").insert({
        work_id: workId,
        description: text(d, "description"),
        cost: number(d, "cost"),
        price: number(d, "price"),
        extra_days: number(d, "days"),
        approved: d.get("approved") === "on",
        approval_date: text(d, "date") || null,
        file_path: path,
      });
      if (r.error) throw r.error;
      setOpen(false);
      refresh();
      toast.success("Extra registrado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function estimate(d: FormData) {
    const r = await supabase
      .from("work_estimates")
      .upsert({ work_id: workId, additional_cost: number(d, "amount"), notes: text(d, "notes") });
    if (r.error) toast.error(r.error.message);
    else {
      refresh();
      toast.success("Estimativa salva.");
    }
  }
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data || !f) return <p className="text-muted-foreground">Carregando resultado…</p>;
  const b = workBase(data.budget);
  const entries = f.entries.filter(
    (e) =>
      !e.canceled &&
      e.direction === "saida" &&
      !e.purchase_order_id &&
      !e.payable_order_id &&
      (e.work_id === workId ||
        f.allocations.some((a) => a.entry_id === e.id && a.work_id === workId)),
  );
  const amount = (e: (typeof entries)[number]) =>
    e.work_id === workId
      ? e.amount
      : f.allocations
          .filter((a) => a.entry_id === e.id && a.work_id === workId)
          .reduce((s, a) => s + a.amount, 0);
  const normal = entries.filter((e) => !["Comissão da arquiteta", "Tributos"].includes(e.category));
  const orders = data.orders
    .filter((o) => o.status !== "cancelado")
    .flatMap((o) => o.purchase_lines);
  const incurred =
    normal.filter((e) => e.incurred).reduce((s, e) => s + amount(e), 0) +
    orders.reduce((s, l) => s + l.received * l.unit_price, 0);
  const committed =
    normal.filter((e) => !e.incurred).reduce((s, e) => s + amount(e), 0) +
    orders.reduce((s, l) => s + (l.quantity - l.received) * l.unit_price, 0);
  const fallback = computeWorkResult(
    b,
    data.extras.filter((e) => e.approved),
    incurred,
    committed,
    data.estimate?.additional_cost ?? null,
    entries
      .filter((e) => e.category === "Comissão da arquiteta")
      .reduce((s, e) => s + amount(e), 0),
    entries.filter((e) => e.category === "Tributos").reduce((s, e) => s + amount(e), 0),
  );
  const summary = dash?.works.find((s) => s.work.id === workId);
  const r = summary?.result ?? fallback;
  return (
    <section className="space-y-6">
      <div className="flex justify-between gap-3">
        <h2 className="font-bold">Resultado e aditivos</h2>
        <Button onClick={() => setOpen(true)}>Registrar extra</Button>
      </div>
      {!r.estimateConfirmed && (
        <p className="border-l-4 border-warning bg-warning/10 p-3 text-sm text-warning-foreground">
          Estimativa para concluir ainda não conferida. O saldo do custo previsto original foi
          preservado na projeção.
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y py-5 lg:grid-cols-3">
        {[
          ["Proposta original", b.listTotal],
          ["Valor fechado", b.saleNet],
          ["Negociação", b.totalDiscount],
          ["Aditivos aprovados", r.extraValue],
          ["Contrato atualizado", r.sale],
          ["Custo previsto original", b.totalCost],
          ["Custo realizado", summary?.incurred ?? incurred],
          ["Compromissos não realizados", summary?.committed ?? committed],
          ["Estimativa adicional", r.remainingEstimate],
          ["Comissão da arquiteta", r.commission],
          ["Tributos / despesas configuradas", r.taxes],
          ["Custo total projetado", r.cost],
          ["Resultado esperado", b.result],
          ["Resultado projetado", r.result],
        ].map(([l, v]) => (
          <div key={String(l)}>
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="font-semibold num">
              {!budgetId &&
              ((!r.estimateConfirmed &&
                ["Resultado projetado", "Custo total projetado", "Estimativa adicional"].includes(
                  String(l),
                )) ||
                [
                  "Resultado esperado",
                  "Custo previsto original",
                  "Negociação",
                  "Proposta original",
                ].includes(String(l)))
                ? "Não conferido"
                : fmtBRL(Number(v))}
            </p>
          </div>
        ))}
        <div>
          <p className="text-xs text-muted-foreground">Margem projetada</p>
          <p className={`font-bold ${r.result < 0 ? "text-destructive" : "text-success"}`}>
            {!budgetId && !r.estimateConfirmed ? "Não conferido" : fmtPct(r.margin)}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Custo projetado = realizado + compromissos não realizados + estimativa adicional + comissão
        + tributos. Resultado = contrato atualizado − custo projetado. Baixas afetam o caixa, não
        repetem o custo.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          estimate(new FormData(e.currentTarget));
        }}
      >
        <Field
          key={data.estimate?.additional_cost}
          name="amount"
          label="Estimativa adicional para concluir (R$)"
          type="number"
          value={data.estimate?.additional_cost}
        />
        <Field
          name="notes"
          label="Itens ainda não contemplados nos compromissos"
          value={data.estimate?.notes}
        />
        <Button type="submit" variant="outline">
          Salvar estimativa
        </Button>
      </form>
      <div className="divide-y">
        {data.extras.map((x) => (
          <article
            key={x.id}
            id={`record-${x.id}`}
            className={`scroll-mt-6 py-4 flex flex-wrap items-start gap-3 ${selectedRecord === x.id ? "border-l-4 border-primary bg-accent/40 pl-3" : ""}`}
          >
            <div className="flex-1">
              <h3 className="font-semibold">{x.description}</h3>
              <p className="text-xs text-muted-foreground">
                {x.approved ? `Aprovado · ${fmtDate(x.approval_date)}` : "Aguardando aprovação"} ·
                prazo +{x.extra_days} dias · custo {fmtBRL(x.cost)}
              </p>
            </div>
            <span className="font-semibold num">{fmtBRL(x.price)}</span>
            <Attachment path={x.file_path} />
          </article>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extra / aditivo</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              extra(new FormData(e.currentTarget));
            }}
          >
            <Field name="description" label="Descrição do serviço / mudança" required />
            <div className="grid grid-cols-2 gap-3">
              <Field name="cost" label="Custo previsto (R$)" type="number" />
              <Field name="price" label="Preço negociado (R$)" type="number" />
            </div>
            <Field name="days" label="Impacto no prazo (dias)" type="number" />
            <label className="flex gap-2 text-sm">
              <input name="approved" type="checkbox" />
              Aprovado pelo cliente
            </label>
            <Field name="date" label="Data da aprovação" type="date" />
            <Field name="proof" label="Comprovante da aprovação" type="file" />
            <Button type="submit" disabled={busy}>
              Salvar extra
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

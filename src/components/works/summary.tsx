import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { dashboardOptions, type WorkSummary } from "@/lib/dashboard-data";
import { fmtBRL, fmtNum, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Installments } from "./installments";
import { supabase } from "@/integrations/supabase/client";
import { splitPayments } from "@/lib/pricing";
import { workComposition, type WorkIndicator } from "@/lib/work-composition";
import { indicatorTotal, type Indicator } from "@/lib/executive";
import { CompositionTable } from "@/components/management/executive";
import { progressAttention } from "@/lib/work-progress";
import { WorkSituation } from "./situation";
import { workOptions } from "@/lib/work-data";
import { ArrowUpRight } from "lucide-react";
export function Metrics({ rows }: { rows: [string, number | null][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-5 border-y py-5 xl:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="break-words text-lg font-bold num">
            {value === null ? "Não conferido" : fmtBRL(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function SummaryNumbers({ s }: { s: WorkSummary }) {
  const a = progressAttention(
    s.progress,
    s.balance.financialProgress,
    s.incurred,
    s.work.origin === "direto" && !s.result.estimateConfirmed ? null : s.result.cost,
  );
  return (
    <>
      <div className="grid gap-5 border-b py-5 sm:grid-cols-3">
        <div>
          <span className="text-sm text-muted-foreground">Avanço físico</span>
          <p className="font-bold">{fmtNum(s.progress)}%</p>
          <progress className="h-2 w-full accent-primary" max={100} value={s.progress} />
        </div>
        <div>
          <span className="text-sm text-muted-foreground">
            Avanço financeiro · recebido / contrato
          </span>
          <p className="font-bold">{fmtNum(s.balance.financialProgress)}%</p>
          <progress
            className="h-2 w-full accent-success"
            max={100}
            value={Math.min(100, s.balance.financialProgress)}
          />
        </div>
        <div>
          <span className="text-sm text-muted-foreground">Consumo de custos previstos</span>
          <p className="font-bold">
            {a.consumed === null ? "Não conferido" : fmtNum(a.consumed) + "%"}
          </p>
          {a.consumed !== null && (
            <progress
              className="h-2 w-full accent-warning"
              max={100}
              value={Math.min(100, a.consumed)}
            />
          )}
        </div>
      </div>
      <div className="space-y-2">
        {a.costAhead && (
          <p className="border-l-4 border-warning bg-warning/10 p-3 text-sm">
            Atenção: consumo de custos acima do avanço físico.
          </p>
        )}
        {a.receiptsBehind && (
          <p className="border-l-4 border-warning bg-warning/10 p-3 text-sm">
            Atenção financeira: recebimentos abaixo do avanço físico.
          </p>
        )}
        {s.overdue > 0 && (
          <p className="border-l-4 border-destructive bg-destructive/10 p-3 text-sm">
            Recebimentos vencidos: {fmtBRL(s.overdue)}
          </p>
        )}
        {!s.result.estimateConfirmed && (
          <p className="border-l-4 border-warning bg-warning/10 p-3 text-sm">
            Estimativa para concluir não conferida.
          </p>
        )}
      </div>
    </>
  );
}
const labels: [WorkIndicator, string][] = [
  ["contract", "Contrato original"],
  ["extras", "Aditivos aprovados"],
  ["updated", "Valor atualizado da obra"],
  ["received", "Recebido"],
  ["receivable", "A receber"],
  ["spent", "Despesas pagas"],
  ["payable", "Contas a pagar"],
  ["cash", "Caixa atual da obra"],
  ["current", "Resultado atual · econômico"],
  ["forecast", "Resultado previsto"],
];
export function WorkSummaryPanel({ workId }: { workId: string }) {
  const { data, error } = useQuery(dashboardOptions);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<WorkIndicator | null>(null);
  const { data: operational } = useQuery(workOptions(workId));
  const [busy, setBusy] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const s = data?.works.find((w) => w.work.id === workId);
  if (error)
    return (
      <p role="alert" className="text-destructive">
        {error.message}
      </p>
    );
  if (!s || !data) return <p>Carregando visão geral…</p>;
  const planned = splitPayments(s.balance.receivable, s.budget.terms).rows.map((r) => ({
    amount: r.value,
    due_date: "",
  }));
  const groups =
    data?.finance.entries.filter(
      (e) => e.work_id === workId && e.direction === "entrada" && !e.canceled,
    ) ?? [];
  async function generate(d: FormData) {
    if (!s) return;
    setBusy(true);
    try {
      const r = await supabase.rpc("create_financial_installments", {
        _request_id: requestId,
        _work_id: workId,
        _source: "contract",
        _description: "Contrato · " + s.work.name,
        _direction: "entrada",
        _category: "Contrato",
        _person_id: s.work.client_id ?? "00000000-0000-0000-0000-000000000000",
        _total: s.balance.receivable,
        _rows: JSON.parse(String(d.get("installments"))),
        _incurred: false,
        _payment_method: "",
        _notes: s.work.payment_conditions || "Condições do orçamento aprovado",
        _cost_center: "",
        _file_path: "",
      });
      if (r.error) throw r.error;
      await qc.invalidateQueries();
      setOpen(false);
      toast.success("Parcelas do contrato geradas.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const compositions = workComposition(data, s);
  const detailRows = detail ? compositions[detail] : [];
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Visão geral</h2>
          <p className="text-sm text-muted-foreground">
            {s.client} · {fmtDate(s.work.actual_start || s.work.planned_start)} →{" "}
            {fmtDate(s.work.planned_end)}
          </p>
        </div>
        {groups.length === 0 && s.balance.receivable > 0 && (
          <Button onClick={() => setOpen(true)}>Gerar parcelas do contrato</Button>
        )}
      </div>
      {operational && (
        <WorkSituation
          work={s.work}
          stages={operational.stages}
          records={operational.records}
          client={s.client}
          progress={s.progress}
        />
      )}
      <SummaryNumbers s={s} />
      <div className="grid grid-cols-2 gap-3 border-b pb-5 lg:grid-cols-3 xl:grid-cols-5">
        {labels.map(([key, label]) => {
          const value = indicatorTotal(compositions[key]);
          return (
            <Button
              key={key}
              variant="ghost"
              aria-label={`Detalhar ${label}`}
              className="h-auto min-h-24 items-start justify-start whitespace-normal rounded-md border-b p-3 text-left"
              onClick={() => setDetail(key)}
            >
              <span className="w-full min-w-0">
                <span className="flex items-start justify-between gap-2 text-xs font-normal text-muted-foreground">
                  {label}
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                </span>
                <span className="mt-2 block break-words text-lg font-bold num">
                  {value === null ? "Não conferido" : fmtBRL(value)}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{labels.find(([key]) => key === detail)?.[1]}</DialogTitle>
          </DialogHeader>
          <p className="text-xl font-bold num">
            {indicatorTotal(detailRows) === null
              ? "Não conferido"
              : fmtBRL(indicatorTotal(detailRows))}
          </p>
          <CompositionTable
            rows={detailRows}
            indicator={
              (["extras", "received", "receivable", "spent", "payable", "cash"].includes(
                detail || "",
              )
                ? detail
                : "result") as Indicator
            }
          />
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferir parcelas do contrato</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <p className="text-sm">Contrato: {fmtBRL(s.base.saleNet)}</p>
            <Installments total={s.balance.receivable} initial={planned} />
            <Button type="submit" disabled={busy}>
              {busy ? "Gerando…" : "Confirmar parcelas"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

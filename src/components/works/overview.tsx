import { businessDate } from "@/lib/dashboard-math";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-me";
import { supabase } from "@/integrations/supabase/client";
import { weightedProgress, financeTotals } from "@/lib/operations";
import { worksOptions } from "@/lib/work-data";
import { financeOptions } from "./finance";
import { fmtBRL, fmtDate, fmtNum } from "@/lib/format";
export function WorkOverview() {
  const { data: me } = useMe();
  const { data: works = [] } = useQuery(worksOptions);
  const { data: f } = useQuery({ ...financeOptions, enabled: !!me?.canSeeCosts });
  const { data: stages = [] } = useQuery({
    queryKey: ["all-work-stages"],
    queryFn: async () => {
      const r = await supabase.from("work_stages").select("*");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const { data: records = [] } = useQuery({
    queryKey: ["attention-records"],
    queryFn: async () => {
      const r = await supabase
        .from("work_records")
        .select("id,work_id,title,due_date,status,kind")
        .not("due_date", "is", null);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const today = businessDate();
  const totals = f ? financeTotals(f.entries, f.settlements) : null;
  const overdue =
    f?.entries.filter(
      (e) =>
        !e.canceled &&
        e.due_date <= today &&
        e.amount >
          f.settlements.filter((s) => s.entry_id === e.id).reduce((t, s) => t + s.amount, 0),
    ) ?? [];
  return (
    <section className="mt-6 space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">Obras em andamento</h2>
        <Link to="/obras" className="text-sm text-primary">
          Todas as obras →
        </Link>
      </div>
      {totals && (
        <div className="grid grid-cols-2 gap-4 border-y py-4 lg:grid-cols-5">
          {[
            ["Recebido", totals.received],
            ["A receber", totals.receivable],
            ["Pago", totals.spent],
            ["A pagar", totals.payable],
            ["Saldo", totals.cash],
          ].map(([l, v]) => (
            <div key={String(l)}>
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="font-semibold num">{fmtBRL(Number(v))}</p>
            </div>
          ))}
        </div>
      )}
      <div className="divide-y">
        {works
          .filter((w) => w.status !== "concluida")
          .map((w) => {
            const own = stages.filter((s) => s.work_id === w.id);
            const progress = weightedProgress(own);
            const delayed = own.filter(
              (s) => s.planned_end && s.planned_end < today && s.progress < 100,
            );
            return (
              <Link
                key={w.id}
                to="/obras/$id"
                params={{ id: w.id }}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div>
                  <h3 className="text-sm font-semibold">{w.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {w.status} · {fmtDate(w.planned_end)}
                  </p>
                  {delayed.length > 0 && (
                    <p className="text-xs text-destructive">
                      {delayed.length} etapa(s) atrasada(s)
                    </p>
                  )}
                </div>
                <span className="font-semibold num">{fmtNum(progress.progress)}%</span>
              </Link>
            );
          })}
        {!works.length && <p className="py-4 text-sm text-muted-foreground">Nenhuma obra ativa.</p>}
      </div>
      {(overdue.length > 0 ||
        records.some(
          (r) => r.due_date && r.due_date <= today && !["aceito", "concluido"].includes(r.status),
        )) && (
        <div className="border-l-4 border-warning bg-warning/10 p-4">
          <h3 className="font-semibold">Atenção</h3>
          {overdue.map((e) => (
            <Link to="/financeiro" key={e.id} className="block py-1 text-sm">
              {e.description} · vencimento {fmtDate(e.due_date)}
            </Link>
          ))}
          {records
            .filter(
              (r) =>
                r.due_date && r.due_date <= today && !["aceito", "concluido"].includes(r.status),
            )
            .map((r) => (
              <Link
                key={r.id}
                to="/obras/$id"
                params={{ id: r.work_id }}
                className="block py-1 text-sm"
              >
                {r.title} · {fmtDate(r.due_date)}
              </Link>
            ))}
        </div>
      )}
    </section>
  );
}

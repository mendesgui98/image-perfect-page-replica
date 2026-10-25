import { businessDate } from "@/lib/dashboard-math";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { workOptions, scheduleVersionsOptions } from "@/lib/work-data";
import { pageMeta } from "@/lib/page-meta";
import { snapshotStages, calendarDays } from "@/lib/work-schedule";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Gantt } from "@/components/works/gantt";
const clientOptions = (id: string) =>
  queryOptions({
    queryKey: ["schedule-client", id],
    queryFn: async () => {
      const w = await supabase
        .from("work_registry")
        .select("client_id,linked_budget_id")
        .eq("id", id)
        .single();
      if (w.error) throw w.error;
      if (w.data.client_id) {
        const p = await supabase.from("people").select("name").eq("id", w.data.client_id).single();
        if (p.error) throw p.error;
        return p.data.name;
      }
      if (w.data.linked_budget_id) {
        const b = await supabase
          .from("budgets")
          .select("client_display")
          .eq("id", w.data.linked_budget_id)
          .single();
        if (b.error) throw b.error;
        return b.data.client_display || "Não informado";
      }
      return "Não informado";
    },
  });
export const Route = createFileRoute("/_authenticated/obras/$id/cronograma/pdf")({
  validateSearch: (s: Record<string, unknown>): { version?: number | undefined } => ({
    version:
      typeof s["version"] === "number" && Number.isInteger(s["version"]) ? s["version"] : undefined,
  }),
  head: () =>
    pageMeta(
      "Cronograma da obra | JMG Reformas",
      "Planejamento da obra com etapas, datas e linha do tempo para acompanhamento do cliente.",
    ),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(workOptions(params.id)),
      context.queryClient.ensureQueryData(scheduleVersionsOptions(params.id)),
      context.queryClient.ensureQueryData(clientOptions(params.id)),
    ]);
  },
  component: SchedulePdf,
});
function SchedulePdf() {
  const { id } = Route.useParams();
  const { version } = Route.useSearch();
  const { data } = useSuspenseQuery(workOptions(id));
  const { data: versions } = useSuspenseQuery(scheduleVersionsOptions(id));
  const { data: client } = useSuspenseQuery(clientOptions(id));
  const saved = versions.find((v) => v.version === version);
  const missing = version !== undefined && !saved;
  const stages = saved ? snapshotStages(saved.stages) : data.stages;
  const start =
    stages
      .map((s) => s.planned_start)
      .filter((s): s is string => !!s)
      .sort()[0] || data.work.planned_start;
  const end =
    stages
      .map((s) => s.planned_end)
      .filter((s): s is string => !!s)
      .sort()
      .at(-1) || data.work.planned_end;
  const today = businessDate();
  return (
    <div className="bg-muted p-4">
      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/obras/$id" params={{ id }} search={{ tab: "cronograma" }}>
            ← Cronograma
          </Link>
        </Button>
        <Button disabled={missing || !stages.length} onClick={() => window.print()}>
          Imprimir / salvar PDF
        </Button>
      </div>
      {missing ? (
        <p role="alert">Versão não encontrada.</p>
      ) : (
        <article className="schedule-print mx-auto max-w-5xl bg-card p-6 text-card-foreground md:p-10">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
            <img src="/jmg-logo-blue.png" alt="JMG Reformas" className="h-20 w-20 object-contain" />
            <div className="text-right">
              <h1 className="text-2xl font-bold">Cronograma da Obra</h1>
              <p className="mt-2 text-xs text-muted-foreground">
                {saved
                  ? saved.version === 1
                    ? "Cronograma Original"
                    : `Reprogramação ${saved.version - 1}`
                  : "Cronograma Atual"}{" "}
                · Emissão {fmtDate(today)}
              </p>
            </div>
          </header>
          <h2 className="mt-6 text-lg font-bold">{data.work.name}</h2>
          <p className="mt-1 text-sm">Cliente: {client}</p>
          <p className="text-sm">Local: {data.work.address || "Não informado"}</p>
          <div className="my-6 grid grid-cols-3 gap-4 border-y py-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Início previsto</p>
              <strong>{fmtDate(start)}</strong>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Previsão de término</p>
              <strong>{fmtDate(end)}</strong>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prazo total</p>
              <strong>{calendarDays(start, end) ?? "—"} dias corridos</strong>
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                {["Etapa / serviços", "Início", "Término", "Duração"].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="p-2">
                    <strong>{s.name}</strong>
                    {s.scope_services && (
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {s.scope_services}
                      </p>
                    )}
                    {s.observations && <p className="mt-1 whitespace-pre-wrap">{s.observations}</p>}
                  </td>
                  <td className="whitespace-nowrap p-2">{fmtDate(s.planned_start)}</td>
                  <td className="whitespace-nowrap p-2">{fmtDate(s.planned_end)}</td>
                  <td className="p-2">
                    {calendarDays(s.planned_start, s.planned_end) ?? "—"} dias
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="mb-3 mt-8 font-bold">Linha do tempo</h2>
          <Gantt
            stages={stages.map((s) => ({
              ...s,
              actual_start: null,
              actual_end: null,
              progress: 0,
              status: "nao_iniciado",
            }))}
          />
          {(saved?.notes ?? data.work.schedule_notes) && (
            <section className="mt-6 border-t pt-4">
              <h2 className="text-sm font-bold">Observações gerais</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {saved?.notes ?? data.work.schedule_notes}
              </p>
            </section>
          )}
          <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
            JMG Reformas · {fmtDate(today)}
          </footer>
        </article>
      )}
    </div>
  );
}

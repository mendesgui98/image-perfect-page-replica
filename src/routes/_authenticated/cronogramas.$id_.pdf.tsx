import { DeletedRecordNotice } from "@/components/management/record-deletion";
import { businessDate } from "@/lib/dashboard-math";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { scheduleOptions } from "@/lib/schedule-data";
import { pageMeta } from "@/lib/page-meta";
import { snapshotStages, calendarDays } from "@/lib/work-schedule";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Gantt } from "@/components/works/gantt";
export const Route = createFileRoute("/_authenticated/cronogramas/$id_/pdf")({
  validateSearch: (s: Record<string, unknown>): { version?: number | undefined } => ({
    version: typeof s["version"] === "number" ? s["version"] : undefined,
  }),
  head: () =>
    pageMeta(
      "Documento do cronograma",
      "Cronograma profissional JMG: etapas, datas e Gantt, sem informações financeiras internas.",
    ),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(scheduleOptions(params.id)),
  component: Document,
});
function Document() {
  const { id } = Route.useParams();
  const { version } = Route.useSearch();
  const { data } = useSuspenseQuery(scheduleOptions(id));
  const h = data.header;
  if (h.deleted_at) return <DeletedRecordNotice entity="schedules" id={id} name={h.name} />;
  const saved = data.versions.find((v) => v.version === version);
  const stages = saved ? snapshotStages(saved.stages) : data.stages;
  const missing = version !== undefined && !saved;
  const start =
      stages
        .map((s) => s.planned_start)
        .filter((s): s is string => !!s)
        .sort()[0] || h.planned_start,
    end =
      stages
        .map((s) => s.planned_end)
        .filter((s): s is string => !!s)
        .sort()
        .at(-1) || h.planned_end;
  const today = businessDate();
  return (
    <div className="bg-muted p-4">
      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/cronogramas/$id" params={{ id }}>
            ← Cronograma
          </Link>
        </Button>
        <Button disabled={missing || !stages.length} onClick={() => window.print()}>
          Imprimir / salvar PDF
        </Button>
        <select
          aria-label="Versão do documento"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={version ?? ""}
          onChange={(e) => {
            const url = new URL(window.location.href);
            if (e.target.value) url.searchParams.set("version", e.target.value);
            else url.searchParams.delete("version");
            window.location.assign(url.href);
          }}
        >
          <option value="">Cronograma Atual</option>
          {data.versions.map((v) => (
            <option key={v.id} value={v.version}>
              {v.version === 1 ? "Cronograma Original" : `Reprogramação ${v.version - 1}`}
            </option>
          ))}
        </select>
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
          <h2 className="mt-6 text-lg font-bold">{h.name}</h2>
          <p className="mt-1 text-sm">Cliente: {h.client_name || "Não informado"}</p>
          <p className="text-sm">Local: {h.address || "Não informado"}</p>
          {h.responsible && <p className="text-sm">Responsável: {h.responsible}</p>}
          <div className="my-6 grid grid-cols-3 gap-4 border-y py-4 text-sm">
            {[
              ["Início previsto", fmtDate(start)],
              ["Previsão de término", fmtDate(end)],
              ["Prazo total", `${calendarDays(start, end) ?? "—"} dias corridos`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40">
                <tr>
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
                        <p className="mt-1 whitespace-pre-wrap">{s.scope_services}</p>
                      )}
                      {s.observations && (
                        <p className="mt-1 whitespace-pre-wrap">{s.observations}</p>
                      )}
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
          </div>
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
          {(saved?.notes ?? h.notes) && (
            <section className="mt-6 border-t pt-4">
              <h2 className="text-sm font-bold">Observações gerais</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{saved?.notes ?? h.notes}</p>
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

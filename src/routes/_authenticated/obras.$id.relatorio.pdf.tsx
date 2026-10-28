import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { workOptions } from "@/lib/work-data";
import { pageMeta } from "@/lib/page-meta";
import { physicalProgress } from "@/lib/work-progress";
import { WorkPhoto } from "@/components/works/photos";
import { fmtDate, fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/obras/$id/relatorio/pdf")({
  head: () =>
    pageMeta(
      "Relatório de evolução",
      "Relatório revisável de andamento, diário e entrega da obra JMG.",
    ),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(workOptions(params.id)),
  component: Report,
});
function Report() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(workOptions(id));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const p = physicalProgress(data.stages);
  const rows = data.records.filter(
    (r) =>
      ["diario", "entrega"].includes(r.kind) &&
      (!from || r.record_date >= from) &&
      (!to || r.record_date <= to),
  );
  return (
    <div className="bg-muted p-4">
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-end gap-3">
        <Button variant="outline" asChild>
          <Link to="/obras/$id" params={{ id }}>
            ← Obra
          </Link>
        </Button>
        <label className="text-sm">
          De
          <input
            aria-label="Data inicial"
            className="block rounded border bg-background p-2"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Até
          <input
            aria-label="Data final"
            className="block rounded border bg-background p-2"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <Button onClick={() => window.print()}>Imprimir / salvar PDF</Button>
      </div>
      <article className="contract-print mx-auto max-w-3xl bg-card p-8 text-card-foreground md:p-12">
        <img
          src="/jmg-logo-blue.png"
          alt="JMG Reformas"
          className="mb-6 h-16 w-16 object-contain"
        />
        <h1 className="text-2xl font-bold">Relatório de evolução</h1>
        <h2 className="mt-3 font-semibold">{data.work.name}</h2>
        <p className="text-sm text-muted-foreground">{data.work.address}</p>
        <h2 className="mt-6 font-semibold">Avanço físico: {fmtNum(p)}%</h2>
        <div className="my-4 divide-y">
          {data.stages.map((s) => (
            <div key={s.id} className="flex justify-between gap-3 py-2 text-sm">
              <div>
                <span>{s.name}</span>
                <p className="text-xs text-muted-foreground">
                  Avanço: vale {fmtNum(s.weight)}% da obra · {s.responsible || "Sem responsável"}
                </p>
                <p className="text-xs">
                  Previsto {fmtDate(s.planned_start)} → {fmtDate(s.planned_end)} · Início real{" "}
                  {fmtDate(s.actual_start)}
                </p>
                {s.observations && <p className="whitespace-pre-wrap">{s.observations}</p>}
                {s.executed_services && (
                  <p className="whitespace-pre-wrap">Executado: {s.executed_services}</p>
                )}
                {s.pending_services && (
                  <p className="whitespace-pre-wrap">Pendências: {s.pending_services}</p>
                )}
                {s.next_services && (
                  <p className="whitespace-pre-wrap">Próximos serviços: {s.next_services}</p>
                )}
              </div>
              <span>{fmtNum(s.progress)}%</span>
            </div>
          ))}
        </div>
        {rows.map((r) => (
          <section
            key={r.id}
            className={`mt-6 border-t pt-4 ${excluded.includes(r.id) ? "no-print opacity-50" : ""}`}
          >
            <label className="no-print mb-2 flex gap-2 text-xs">
              <input
                type="checkbox"
                checked={!excluded.includes(r.id)}
                onChange={(e) =>
                  setExcluded(
                    e.target.checked ? excluded.filter((x) => x !== r.id) : [...excluded, r.id],
                  )
                }
              />
              Incluir no relatório
            </label>
            <p className="text-xs text-muted-foreground">
              {fmtDate(r.record_date)} · {r.responsible}
            </p>
            <h3 className="mt-1 font-semibold">{r.title}</h3>
            {r.stage_id && (
              <p className="text-xs text-muted-foreground">
                Etapa: {data.stages.find((s) => s.id === r.stage_id)?.name}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
            {r.file_path && /\.(png|jpg|jpeg|webp)$/i.test(r.file_path) && (
              <WorkPhoto path={r.file_path} caption={r.caption} />
            )}
            <p className="mt-2 text-sm">{r.next_steps}</p>
          </section>
        ))}
      </article>
    </div>
  );
}

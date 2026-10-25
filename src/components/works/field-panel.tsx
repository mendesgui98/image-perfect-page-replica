import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarCheck, ClipboardList, NotebookPen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { businessDate } from "@/lib/dashboard-math";
import { fieldAgenda } from "@/lib/field-agenda";
import { fmtDate, fmtNum } from "@/lib/format";
import { worksOptions } from "@/lib/work-data";
import { Button } from "@/components/ui/button";

const activeStagesOptions = {
  queryKey: ["field-stages"],
  queryFn: async () => {
    const r = await supabase
      .from("work_stages")
      .select(
        "id,work_id,name,progress,weight,status,planned_start,planned_end,responsible,removed",
      )
      .eq("removed", false)
      .lt("progress", 100);
    if (r.error) throw r.error;
    return r.data;
  },
};

const openRecordsOptions = {
  queryKey: ["field-records"],
  queryFn: async () => {
    const r = await supabase
      .from("work_records")
      .select("id,work_id,title,due_date,status,kind")
      .not("due_date", "is", null)
      .not("status", "in", "(aceito,concluido)");
    if (r.error) throw r.error;
    return r.data;
  },
};

/** "Hoje na obra": painel de abertura da equipe de campo. */
export function FieldPanel() {
  const { data: works = [] } = useQuery(worksOptions);
  const { data: stages = [] } = useQuery(activeStagesOptions);
  const { data: records = [] } = useQuery(openRecordsOptions);
  const today = businessDate();
  const agenda = fieldAgenda(works, stages, records, today);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Hoje na obra · {fmtDate(today)}</h2>
      </div>
      {!agenda.length && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          Nenhuma etapa programada para hoje e nenhuma pendência vencida.
        </p>
      )}
      {agenda.map(({ work, stages: list, dueRecords }) => (
        <article key={work.id} className="rounded-lg border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link
                to="/obras/$id"
                params={{ id: work.id }}
                className="font-semibold hover:underline"
              >
                {work.name}
              </Link>
              {work.address && <p className="text-xs text-muted-foreground">{work.address}</p>}
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/obras/$id" params={{ id: work.id }} search={{ tab: "diario" }}>
                <NotebookPen className="h-4 w-4" />
                Registrar diário
              </Link>
            </Button>
          </div>
          {list.length > 0 && (
            <ul className="mt-3 divide-y text-sm">
              {list.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    to="/obras/$id"
                    params={{ id: work.id }}
                    search={{ tab: "etapas" }}
                    className="min-w-0 flex-1"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s.responsible || "Sem responsável"} · até {fmtDate(s.planned_end)}
                    </span>
                  </Link>
                  {s.situation === "atrasada" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" /> Atrasada
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Em execução</span>
                  )}
                  <span className="w-12 text-right font-semibold num">{fmtNum(s.progress)}%</span>
                </li>
              ))}
            </ul>
          )}
          {dueRecords.length > 0 && (
            <div className="mt-3 rounded-md bg-warning/10 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1 font-semibold">
                <ClipboardList className="h-4 w-4" /> Pendências vencidas
              </p>
              {dueRecords.map((r) => (
                <Link
                  key={r.id}
                  to="/obras/$id"
                  params={{ id: work.id }}
                  search={{ tab: r.kind ?? "diario", record: r.id }}
                  className="block py-0.5 hover:underline"
                >
                  {r.title} · {fmtDate(r.due_date)}
                </Link>
              ))}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

import { CalendarDays, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordDeleteButton, RecordTrash } from "@/components/management/record-deletion";
import { businessDate } from "@/lib/dashboard-math";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { schedulesOptions, scheduleStatus } from "@/lib/schedule-data";
import { physicalProgress } from "@/lib/work-progress";
import { fmtDate, fmtNum } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/components/works/fields";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { IconBubble, type Tone } from "@/components/kpi";
import { panelClass } from "@/lib/surface";
import { cn } from "@/lib/utils";
import { EmptyState, ListSkeleton, PageSkeleton } from "@/components/feedback";
const STATE: Record<string, { variant: BadgeProps["variant"]; icon: Tone }> = {
  ativo: { variant: "info", icon: "brand" },
  concluido: { variant: "positive", icon: "positive" },
  atrasado: { variant: "negative", icon: "negative" },
  elaboracao: { variant: "neutral", icon: "neutral" },
};
const labels: Record<string, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  atrasado: "Atrasado",
  elaboracao: "Em elaboração",
};
export function ScheduleList() {
  const { data } = useSuspenseQuery(schedulesOptions);
  const [q, setQ] = useState(""),
    [client, setClient] = useState(""),
    [work, setWork] = useState(""),
    [status, setStatus] = useState(""),
    [kind, setKind] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const today = businessDate();
  const rows = data.filter(({ header: h, stages }) => {
    const start =
      stages
        .map((s) => s.planned_start)
        .filter((s): s is string => !!s)
        .sort()[0] || h.planned_start;
    const end =
      stages
        .map((s) => s.planned_end)
        .filter((s): s is string => !!s)
        .sort()
        .at(-1) || h.planned_end;
    return (
      (!q ||
        (h.name + " " + h.client_name + " " + h.address).toLowerCase().includes(q.toLowerCase())) &&
      (!client || h.client_name === client) &&
      (!work || h.work_id === work) &&
      (!status || scheduleStatus(stages, today) === status) &&
      ((!kind && !h.is_template) ||
        (kind === "modelo" && h.is_template) ||
        (kind === "avulso" && !h.work_id && !h.is_template) ||
        (kind === "vinculado" && !!h.work_id && !h.is_template) ||
        kind === "todos") &&
      (!from || (!!end && end >= from)) &&
      (!to || (!!start && start <= to))
    );
  });
  return (
    <section className="space-y-5">
      <div
        className={cn(
          panelClass,
          "grid grid-cols-2 gap-3 p-4 shadow-none xl:grid-cols-4 [&>label]:col-span-2 sm:[&>label]:col-span-1 [&>label]:text-xs [&>label]:font-medium",
        )}
      >
        <Input
          className="col-span-2 xl:col-span-1"
          aria-label="Buscar cronograma"
          placeholder="Buscar projeto, cliente ou local"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Filtrar cliente"
          className={selectClass}
          value={client}
          onChange={(e) => setClient(e.target.value)}
        >
          <option value="">Todos os clientes</option>
          {[...new Set(data.map((d) => d.header.client_name).filter(Boolean))].sort().map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar obra"
          className={selectClass}
          value={work}
          onChange={(e) => setWork(e.target.value)}
        >
          <option value="">Todas as obras</option>
          {data
            .filter((d) => d.header.work_id)
            .map((d) => (
              <option key={d.header.id} value={d.header.work_id ?? ""}>
                {d.header.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filtrar situação"
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todas as situações</option>
          {Object.entries(labels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar tipo"
          className={selectClass}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">Cronogramas</option>
          <option value="avulso">Cronograma avulso</option>
          <option value="vinculado">Vinculado à obra</option>
          <option value="modelo">Modelos de cronograma</option>
          <option value="todos">Todos e modelos</option>
        </select>
        <label className="text-xs text-muted-foreground">
          Período a partir de
          <Input
            aria-label="Período a partir de"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Período até
          <Input
            aria-label="Período até"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{rows.length} cronogramas</p>
        <RecordTrash entity="schedules" />
      </div>
      <div className={cn(panelClass, "divide-y divide-border/60 overflow-hidden")}>
        {rows.map(({ header: h, stages, initialProgress }) => {
          const state = scheduleStatus(stages, today);
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
          const progress = physicalProgress(
            stages.map((s) => ({
              ...s,
              weight: "weight" in s ? s.weight : 0,
              progress: s.progress ?? 0,
            })),
            initialProgress,
          );
          const tone = STATE[state] ?? { variant: "neutral" as const, icon: "neutral" as const };
          return (
            <article
              key={h.id}
              className="flex gap-3 px-4 py-4 transition-colors hover:bg-foreground/[0.02] sm:px-5"
            >
              <IconBubble icon={CalendarDays} tone={tone.icon} />
              <div className="min-w-0 flex-1 gap-4 md:flex md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/cronogramas/$id"
                      params={{ id: h.id }}
                      className="font-semibold leading-snug text-foreground hover:text-primary"
                    >
                      {h.name}
                    </Link>
                    <Badge variant={tone.variant}>{labels[state]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {h.client_name || "—"} ·{" "}
                    {h.is_template
                      ? "Modelo de cronograma"
                      : h.work_id
                        ? "Vinculado à obra"
                        : "Cronograma avulso"}
                    {h.address ? ` · ${h.address}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground num">
                    {fmtDate(start)} → {fmtDate(end)}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="mt-3 md:mt-0">
                  {h.work_id ? (
                    <Link to="/obras/$id/cronograma/pdf" params={{ id: h.work_id }}>
                      <FileDown className="h-4 w-4" />
                      PDF
                    </Link>
                  ) : (
                    <Link to="/cronogramas/$id/pdf" params={{ id: h.id }}>
                      <FileDown className="h-4 w-4" />
                      PDF
                    </Link>
                  )}
                </Button>
                <div className="mt-3 flex items-center gap-3 md:mt-0 md:w-56">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Avanço</span>
                      <span className="font-semibold num">{fmtNum(progress)}%</span>
                    </div>
                    <progress
                      value={progress}
                      max="100"
                      className="mt-1.5 h-1.5 w-full accent-primary"
                    />
                  </div>
                  <RecordDeleteButton entity="schedules" id={h.id} name={h.name} />
                </div>
              </div>
            </article>
          );
        })}
        {!rows.length && (
          <EmptyState
            compact
            icon={CalendarDays}
            title="Nenhum cronograma encontrado"
            description="Crie um cronograma avulso ou vinculado a uma obra."
            className="py-10"
          />
        )}
      </div>
    </section>
  );
}

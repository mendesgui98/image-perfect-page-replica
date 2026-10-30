import { useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Banknote, CalendarDays, Clock, FileDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { RecordDeleteButton, RecordTrash } from "@/components/management/record-deletion";
import { businessDate } from "@/lib/dashboard-math";
import { schedulesOptions } from "@/lib/schedule-data";
import { schedulesFinanceOptions } from "@/lib/work-data";
import {
  SCHEDULE_LIST_STATUS,
  nextPayment,
  scheduleIndicators,
  scheduleListStatus,
  upcomingPayments,
  type DashPayment,
  type ScheduleListStatus,
} from "@/lib/schedule-dashboard";
import { fmtBRL, fmtDate, fmtNum } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { selectClass } from "@/components/works/fields";
import { IconBubble, KpiCard, Segmented } from "@/components/kpi";
import { EmptyState } from "@/components/feedback";
import { panelClass, segmentClass } from "@/lib/surface";
import { cn } from "@/lib/utils";
import { MiniTimeline } from "./mini-timeline";

// Lista de cronogramas (painel): indicadores, filtros por situação e um card por cronograma com a
// linha do tempo resumida, avanço previsto × realizado e o próximo pagamento. Contas da
// schedule-dashboard.ts; pagamentos das contas a receber (só admin/financeiro).

const BADGE: Record<ScheduleListStatus, BadgeProps["variant"]> = {
  elaboracao: "neutral",
  execucao: "positive",
  atrasado: "negative",
  concluido: "info",
};
const FILTERS: [ScheduleListStatus | "", string][] = [
  ["", "Todas"],
  ["elaboracao", "Em elaboração"],
  ["execucao", "Em execução"],
  ["atrasado", "Atrasadas"],
  ["concluido", "Concluídas"],
];

const weeksBetween = (start: string | null, end: string | null) =>
  start && end
    ? Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / (7 * 86_400_000)) + 1)
    : null;

export function ScheduleList() {
  const { data } = useSuspenseQuery(schedulesOptions);
  const { data: me } = useMe();
  const { data: finance = [] } = useQuery(schedulesFinanceOptions(!!me?.canSeeCosts));
  const qc = useQueryClient();
  const [q, setQ] = useState(""),
    [client, setClient] = useState(""),
    [work, setWork] = useState(""),
    [status, setStatus] = useState<ScheduleListStatus | "">(""),
    [kind, setKind] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [importing, setImporting] = useState("");
  const today = businessDate();

  const all = data.map((row) => {
    const { header: h, stages } = row;
    const dated = stages.filter((s) => s.planned_start);
    const start = dated.map((s) => s.planned_start!).sort()[0] ?? h.planned_start;
    const end =
      dated
        .map((s) => s.planned_end || s.planned_start!)
        .sort()
        .at(-1) ?? h.planned_end;
    const dash = stages.map((s) => ({
      ...s,
      weight: "weight" in s ? s.weight : 0,
      progress: s.progress ?? 0,
    }));
    const payments: DashPayment[] = h.work_id ? finance.filter((p) => p.workId === h.work_id) : [];
    return {
      ...row,
      start,
      end,
      dated,
      state: scheduleListStatus(dash, today),
      ind: scheduleIndicators(dash, today, row.initialProgress),
      payments,
      next: nextPayment(payments),
    };
  });
  const visible = all.filter((r) => {
    const h = r.header;
    return (
      (!q ||
        (h.name + " " + h.client_name + " " + h.address).toLowerCase().includes(q.toLowerCase())) &&
      (!client || h.client_name === client) &&
      (!work || h.work_id === work) &&
      ((!kind && !h.is_template) ||
        (kind === "modelo" && h.is_template) ||
        (kind === "avulso" && !h.work_id && !h.is_template) ||
        (kind === "vinculado" && !!h.work_id && !h.is_template) ||
        kind === "todos") &&
      (!from || (!!r.end && r.end >= from)) &&
      (!to || (!!r.start && r.start <= to))
    );
  });
  const rows = visible.filter((r) => !status || r.state === status);
  const active = visible.filter((r) => r.state !== "concluido");
  const lateWorks = visible.filter((r) => r.ind.late.length);
  const upcoming = upcomingPayments(
    visible.flatMap((r) => r.payments),
    today,
  );

  async function importFromBudget(workId: string) {
    setImporting(workId);
    const r = await supabase.rpc("import_work_schedule", { _work_id: workId });
    setImporting("");
    if (r.error) return void toast.error(r.error.message);
    toast.success("Etapas importadas do orçamento.");
    await qc.invalidateQueries({ queryKey: ["schedules"] });
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Cronogramas ativos"
          value={active.length}
          icon={CalendarDays}
          tone="brand"
        />
        <KpiCard
          label="Em execução"
          value={visible.filter((r) => r.state === "execucao").length}
          icon={TrendingUp}
          tone="positive"
          hint={`${visible.filter((r) => r.state === "elaboracao").length} em elaboração`}
        />
        <KpiCard
          label="Etapas atrasadas"
          value={lateWorks.reduce((n, r) => n + r.ind.late.length, 0)}
          icon={AlertTriangle}
          tone="negative"
          hint={`em ${lateWorks.length} ${lateWorks.length === 1 ? "obra" : "obras"}`}
        />
        <KpiCard
          label="Próximas medições (30 dias)"
          value={me?.canSeeCosts ? fmtBRL(upcoming) : "—"}
          icon={Banknote}
          tone="alert"
        />
      </div>

      <div className={cn(panelClass, "flex flex-wrap items-center gap-3 p-3 shadow-none")}>
        <Input
          className="min-w-56 flex-1"
          aria-label="Buscar cronograma"
          placeholder="Buscar projeto, cliente ou local"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Filtrar cliente"
          className={cn(selectClass, "w-auto")}
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
          className={cn(selectClass, "w-auto")}
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
        <Segmented>
          {FILTERS.map(([v, l]) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={status === v}
              onClick={() => setStatus(v)}
              className={segmentClass(status === v)}
            >
              {l}
            </button>
          ))}
        </Segmented>
        <details className="relative">
          <summary
            className={cn(
              selectClass,
              "flex w-auto cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Período e tipo
          </summary>
          <div
            className={cn(
              panelClass,
              "absolute right-0 z-20 mt-2 grid w-72 gap-3 p-4 text-xs [&>label]:grid [&>label]:gap-1",
            )}
          >
            <label>
              Tipo
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
            </label>
            <label>
              Período a partir de
              <Input
                aria-label="Período a partir de"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Período até
              <Input
                aria-label="Período até"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        </details>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "cronograma" : "cronogramas"}
        </p>
        <RecordTrash entity="schedules" />
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const h = r.header;
          const weeks = weeksBetween(r.start, r.end);
          const behind = r.ind.delta < -5;
          return (
            <article
              key={h.id}
              className={cn(
                panelClass,
                "grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_auto] lg:items-center",
              )}
            >
              <div className="flex min-w-0 gap-3">
                <IconBubble icon={CalendarDays} tone="brand" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/cronogramas/$id"
                      params={{ id: h.id }}
                      className="text-base font-semibold leading-snug text-foreground hover:text-primary"
                    >
                      {h.name}
                    </Link>
                    <Badge variant={BADGE[r.state]}>● {SCHEDULE_LIST_STATUS[r.state]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {h.client_name || "Cliente não informado"}
                    {h.address ? ` · ${h.address}` : ""}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium num">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {fmtDate(r.start)} → {fmtDate(r.end)}
                    </span>
                    <span className="text-muted-foreground">
                      <b className="text-foreground">{weeks ?? "—"}</b> semanas
                    </span>
                    <span className="text-muted-foreground">
                      <b className="text-foreground">{r.dated.length}</b> etapas
                    </span>
                    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                      Rev. {String(r.revision).padStart(2, "0")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                {r.dated.length ? (
                  <MiniTimeline stages={r.stages} payments={r.payments} today={today} />
                ) : (
                  <div className="flex min-h-14 items-center justify-center rounded-xl border border-dashed border-border px-3 text-center text-sm text-muted-foreground">
                    Sem etapas ainda
                    {h.work_id && me?.canSeeCosts && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          disabled={importing === h.work_id}
                          onClick={() => void importFromBudget(h.work_id!)}
                          className="font-semibold text-primary hover:underline disabled:opacity-60"
                        >
                          Importar do orçamento
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-2 text-sm">
                <Progress label="Previsto" value={r.ind.planned} />
                <Progress
                  label="Realizado"
                  value={r.ind.realized}
                  tone={behind ? "negative" : "positive"}
                />
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <Banknote className="mr-1.5 inline h-3.5 w-3.5 text-positive" />
                  {!r.dated.length ? (
                    "Defina a data de início para gerar o cronograma"
                  ) : r.next ? (
                    <>
                      Próxima: <b className="text-foreground">{r.next.label}</b>
                      {me?.canSeeCosts && ` · ${fmtBRL(r.next.amount - (r.next.paid ?? 0))}`} ·{" "}
                      {fmtDate(r.next.date)}
                    </>
                  ) : (
                    <>
                      Início em <b className="text-foreground">{fmtDate(r.start)}</b>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-row gap-2 lg:w-32 lg:flex-col">
                <Button asChild className="flex-1">
                  <Link to="/cronogramas/$id" params={{ id: h.id }}>
                    Abrir
                  </Link>
                </Button>
                <Button variant="outline" asChild className="flex-1">
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
                <div className="flex justify-center">
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
            className={cn(panelClass, "py-10")}
          />
        )}
      </div>
    </section>
  );
}

function Progress({
  label,
  value,
  tone = "brand",
}: {
  label: string;
  value: number;
  tone?: "brand" | "positive" | "negative";
}) {
  const bar = { brand: "bg-primary/70", positive: "bg-positive", negative: "bg-negative" }[tone];
  const text = { brand: "text-foreground", positive: "text-positive", negative: "text-negative" }[
    tone
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{label}</span>
        <b className={cn("num", text)}>{fmtNum(value, 0)}%</b>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <i
          className={cn("block h-full rounded-full", bar)}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileDown,
  History,
  Pencil,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { useWorkSheetProps } from "@/hooks/use-work-sheet-props";
import { businessDate } from "@/lib/dashboard-math";
import { fmtBRL, fmtDate, fmtNum } from "@/lib/format";
import {
  SCHEDULE_LIST_STATUS,
  addDaysIso,
  lateStages,
  nextPayment,
  paymentState,
  progressHistory,
  scheduleIndicators,
  scheduleListStatus,
  shiftStageDates,
  stageExpected,
  type DashPayment,
} from "@/lib/schedule-dashboard";
import { buildScheduleSheets, WEEKS_PER_SHEET } from "@/lib/schedule-sheets";
import { stageServicesOptions, type StageService } from "@/lib/stage-services-data";
import { calendarDays } from "@/lib/work-schedule";
import { servicesProgress, statusForProgress } from "@/lib/work-progress";
import {
  clientMaterialsOptions,
  scheduleFinanceOptions,
  scheduleVersionsOptions,
  stageHistoryOptions,
  workOptions,
} from "@/lib/work-data";
import { ClientMaterials } from "@/components/works/client-materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { panelClass, segmentClass } from "@/lib/surface";
import { cn } from "@/lib/utils";

// Página do cronograma vinculado a uma obra (painel): cabeçalho com indicadores, grade semanal com
// previsto × executado, marcos de pagamento e materiais do cliente, e o "Lançar avanço" da etapa.
// As contas vêm de schedule-dashboard.ts e as folhas de buildScheduleSheets (as mesmas do PDF).

const DAY = 86_400_000;
const t = (d: string) => Date.parse(`${d.slice(0, 10)}T12:00:00Z`);
const weeksBetween = (a: string, b: string) =>
  Math.max(1, Math.round((calendarDays(a, b) ?? 7) / 7));

type Tab = "cronograma" | "avanco" | "pagamentos" | "materiais" | "revisoes";

function Pie({ value, late }: { value: number; late?: boolean }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(${late ? "var(--destructive)" : "var(--primary)"} ${v * 3.6}deg, var(--muted) 0)`,
      }}
      aria-hidden
    />
  );
}

export function ScheduleDashboard({ workId }: { workId: string }) {
  const { data } = useSuspenseQuery(workOptions(workId));
  const { data: me } = useMe();
  const qc = useQueryClient();
  const costs = !!me?.canSeeCosts;
  const sheet = useWorkSheetProps({ workId, work: data.work, stages: data.stages });
  const { data: finance } = useQuery(
    scheduleFinanceOptions(workId, data.work.linked_budget_id, costs),
  );
  const { data: materials = [] } = useQuery(clientMaterialsOptions(workId));
  const { data: versions = [] } = useQuery(scheduleVersionsOptions(workId));
  const { data: services = [] } = useQuery(stageServicesOptions(workId));
  const { data: history = [] } = useQuery(stageHistoryOptions(workId, costs));
  const { data: initial = 0 } = useQuery({
    queryKey: ["work-opening-progress", workId],
    queryFn: async () => {
      const r = await supabase
        .from("work_openings")
        .select("progress")
        .eq("work_id", workId)
        .maybeSingle();
      if (r.error) throw r.error;
      return Number(r.data?.progress ?? 0);
    },
  });
  const today = businessDate();
  const payments: DashPayment[] = finance?.payments ?? [];
  const stages = useMemo(
    () => [...data.stages].filter((s) => s.planned_start).sort((a, b) => a.sort - b.sort),
    [data.stages],
  );
  const ind = scheduleIndicators(data.stages, today, initial);
  const late = new Set(lateStages(stages, today).map((s) => s.id));
  const status = scheduleListStatus(data.stages, today);
  const plan = buildScheduleSheets({
    stages: sheet.stages,
    payments: sheet.payments ?? [],
    materials: sheet.materials ?? [],
  });
  const todaySheet = plan
    ? Math.max(
        0,
        Math.min(
          plan.sheets.length - 1,
          plan.sheets.findIndex((s) => s.to >= today),
        ),
      )
    : 0;
  const [tab, setTab] = useState<Tab>("cronograma");
  const [page, setPage] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const current = page ?? (todaySheet < 0 ? 0 : todaySheet);
  const next = nextPayment(payments);
  const start = plan?.start ?? null,
    end = plan?.end ?? null;
  const refresh = () => {
    for (const key of [
      ["work", workId],
      ["schedule"],
      ["schedules"],
      ["schedule-versions", workId],
      ["stage-history", workId],
      ["all-work-stages"],
      ["financial-dashboard"],
    ])
      qc.invalidateQueries({ queryKey: key });
  };
  const tabs: { id: Tab; label: string }[] = [
    { id: "cronograma", label: "Cronograma" },
    { id: "avanco", label: "Avanço físico" },
    ...(costs ? [{ id: "pagamentos" as Tab, label: `Pagamentos (${payments.length})` }] : []),
    { id: "materiais", label: `Materiais do cliente (${materials.length})` },
    { id: "revisoes", label: `Revisões (${versions.length})` },
  ];
  const kpis: {
    label: string;
    value: string;
    hint?: string | undefined;
    tone?: string | undefined;
  }[] = [
    { label: "Início", value: start ? fmtDate(start) : "—" },
    { label: "Término previsto", value: end ? fmtDate(end) : "—" },
    {
      label: "Duração",
      value: plan ? `${plan.totalWeeks} semanas` : "—",
      hint: start && end ? `${calendarDays(start, end)} dias` : undefined,
    },
    { label: "Avanço previsto", value: `${fmtNum(ind.planned, 1)}%`, hint: "para hoje" },
    {
      label: "Avanço realizado",
      value: `${fmtNum(ind.realized, 1)}%`,
      hint: `${ind.delta >= 0 ? "+" : ""}${fmtNum(ind.delta, 1)} p.p.`,
      tone: ind.delta < -5 ? "text-red-300" : ind.delta >= 0 ? "text-emerald-300" : undefined,
    },
    ...(costs
      ? [
          {
            label: "Próximo pagamento",
            value: next ? fmtBRL(next.amount - (next.paid ?? 0)) : "—",
            hint: next ? `${next.label} · ${fmtDate(next.date)}` : "nada em aberto",
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-5">
      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-hero to-hero-end px-5 py-6 text-hero-foreground shadow-hero md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold">
              CRONOGRAMA FÍSICO-FINANCEIRO
            </p>
            <h1 className="text-2xl font-semibold md:text-3xl">{data.work.name}</h1>
            <p className="text-sm text-hero-foreground/80">
              {[sheet.client, data.work.address].filter(Boolean).join(" · ") ||
                "Cliente não informado"}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {[...sheet.codes, sheet.revision].map((c) => (
                <span key={c} className="rounded-full bg-white/10 px-2.5 py-1 font-medium">
                  {c}
                </span>
              ))}
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-semibold",
                  status === "atrasado"
                    ? "bg-red-500/25 text-red-100"
                    : status === "execucao"
                      ? "bg-emerald-500/25 text-emerald-100"
                      : "bg-white/15",
                )}
              >
                {SCHEDULE_LIST_STATUS[status]}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/25 bg-white/10 text-hero-foreground hover:bg-white/20"
              onClick={() => setTab("revisoes")}
            >
              <History className="h-4 w-4" />
              Revisões
            </Button>
            <Button
              variant="outline"
              className="border-white/25 bg-white/10 text-hero-foreground hover:bg-white/20"
              asChild
            >
              <Link to="/obras/$id" params={{ id: workId }} search={{ tab: "cronograma" }}>
                <Pencil className="h-4 w-4" />
                Editar etapas
              </Link>
            </Button>
            <Button className="bg-gold text-hero-end hover:bg-gold/90" asChild>
              <Link to="/obras/$id/cronograma/pdf" params={{ id: workId }}>
                <FileDown className="h-4 w-4" />
                Gerar PDF
              </Link>
            </Button>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="min-w-0">
              <dt className="text-xs text-hero-foreground/70">{k.label}</dt>
              <dd className="truncate text-lg font-semibold">{k.value}</dd>
              {k.hint && (
                <dd className={cn("text-xs text-hero-foreground/70", k.tone)}>{k.hint}</dd>
              )}
            </div>
          ))}
        </dl>
      </section>

      <nav
        className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0 [&>button]:whitespace-nowrap"
        aria-label="Seções do cronograma"
      >
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            className={segmentClass(tab === x.id)}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </nav>

      {tab === "cronograma" &&
        (plan ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className={cn(panelClass, "min-w-0 p-4")}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Semanas anteriores"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  S{plan.sheets[current]!.firstWeek}–S{plan.sheets[current]!.lastWeek} ·{" "}
                  {fmtDate(plan.sheets[current]!.from)} a {fmtDate(plan.sheets[current]!.to)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Próximas semanas"
                  disabled={current >= plan.sheets.length - 1}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPage(null)}>
                  <CalendarDays className="h-4 w-4" />
                  Ir para hoje
                </Button>
                <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <i className="h-2.5 w-5 rounded-sm bg-primary/20" /> Previsto
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="h-2.5 w-5 rounded-sm bg-primary" /> Executado
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="h-2.5 w-5 rounded-sm bg-destructive" /> Atrasado
                  </span>
                  {costs && (
                    <span className="flex items-center gap-1">
                      <i className="h-2 w-2 rotate-45 bg-positive" /> Pagamento
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <i className="h-2 w-2 rounded-full bg-gold" /> Material do cliente
                  </span>
                </span>
              </div>
              <WeekGrid
                sheetIndex={current}
                plan={plan}
                stages={stages}
                late={late}
                today={today}
                selected={selected}
                onSelect={setSelected}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                {sheet.revision} · Folha {current + 1} de {plan.sheets.length} no PDF · clique em
                uma etapa para lançar o avanço
              </p>
            </section>
            <aside className={cn(panelClass, "h-fit p-4")}>
              {selected && stages.some((s) => s.id === selected) ? (
                <ProgressPanel
                  key={selected}
                  workId={workId}
                  stage={stages.find((s) => s.id === selected)!}
                  stages={stages}
                  services={services}
                  history={history.filter((h) => h.entity_id === selected)}
                  costs={costs}
                  needsReason={versions.length > 0}
                  today={today}
                  onClose={() => setSelected(null)}
                  onSaved={refresh}
                />
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Lançar avanço
                  </h2>
                  <p>Escolha uma etapa na grade para lançar o avanço ou ajustar as datas.</p>
                  {late.size > 0 && (
                    <p className="text-destructive">
                      {late.size} etapa{late.size > 1 ? "s" : ""} com término vencido.
                    </p>
                  )}
                </div>
              )}
            </aside>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 xl:col-span-2">
              {costs && <PaymentsCard payments={payments} today={today} />}
              <MaterialsCard
                materials={materials}
                stages={stages}
                onOpen={() => setTab("materiais")}
              />
              <VersionsCard workId={workId} versions={versions} />
            </div>
          </div>
        ) : (
          <p className={cn(panelClass, "p-6 text-sm text-muted-foreground")}>
            Nenhuma etapa com datas ainda. Defina as datas das etapas na obra (ou aprove o orçamento
            com o cronograma preenchido) para gerar o cronograma.
          </p>
        ))}

      {tab === "avanco" && (
        <section className={cn(panelClass, "overflow-x-auto p-4")}>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Etapa</th>
                <th>Período</th>
                <th className="pr-6 text-right">Peso</th>
                <th className="w-48 pr-6">Previsto para hoje</th>
                <th className="w-48 pr-6">Realizado</th>
                <th className="text-right">Situação</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => {
                const exp = stageExpected(s, today),
                  d = (s.progress ?? 0) - exp;
                return (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="text-muted-foreground">
                      {fmtDate(s.planned_start)} – {fmtDate(s.planned_end)}
                    </td>
                    <td className="pr-6 text-right">{fmtNum(s.weight ?? 0)}%</td>
                    <td className="pr-6">
                      <Bar value={exp} className="bg-primary/40" />
                    </td>
                    <td className="pr-6">
                      <Bar
                        value={s.progress ?? 0}
                        className={late.has(s.id) ? "bg-destructive" : "bg-primary"}
                      />
                    </td>
                    <td
                      className={cn(
                        "text-right font-medium",
                        d < -5 ? "text-destructive" : d >= 0 ? "text-positive" : "",
                      )}
                    >
                      {d >= 0 ? "+" : ""}
                      {fmtNum(d, 1)} p.p.
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === "pagamentos" && costs && (
        <section className={cn(panelClass, "overflow-x-auto p-4")}>
          {payments.length ? (
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Marco</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Recebido</th>
                  <th className="text-right">Situação</th>
                </tr>
              </thead>
              <tbody>
                {[...payments]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-2 font-medium">{p.label}</td>
                      <td>{fmtDate(p.date)}</td>
                      <td className="text-right">{fmtBRL(p.amount)}</td>
                      <td className="text-right">{fmtBRL(p.paid ?? 0)}</td>
                      <td className="text-right">
                        <PaymentBadge state={paymentState(p, today)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta a receber desta obra no Financeiro.
            </p>
          )}
        </section>
      )}

      {tab === "materiais" && <ClientMaterials workId={workId} stages={data.stages} />}

      {tab === "revisoes" && (
        <section className={cn(panelClass, "p-4")}>
          <VersionsList workId={workId} versions={versions} />
        </section>
      )}
    </div>
  );
}

function Bar({ value, className }: { value: number; className: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <i className={cn("block h-full rounded-full", className)} style={{ width: `${v}%` }} />
      </span>
      <span className="w-12 text-right text-xs tabular-nums">{fmtNum(v, 1)}%</span>
    </span>
  );
}

function PaymentBadge({ state }: { state: "pago" | "vencido" | "previsto" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        state === "pago"
          ? "bg-positive/15 text-positive"
          : state === "vencido"
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground",
      )}
    >
      {state === "pago" ? "Pago" : state === "vencido" ? "Vencido" : "Previsto"}
    </span>
  );
}

type Plan = NonNullable<ReturnType<typeof buildScheduleSheets>>;
type Stage = {
  id: string;
  name: string;
  planned_start: string | null;
  planned_end: string | null;
  progress: number;
  weight: number;
  status: string | null;
};

function WeekGrid({
  sheetIndex,
  plan,
  stages,
  late,
  today,
  selected,
  onSelect,
}: {
  sheetIndex: number;
  plan: Plan;
  stages: Stage[];
  late: Set<string>;
  today: string;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const sh = plan.sheets[sheetIndex]!;
  const from = t(sh.weeks[0]!.date);
  const span = WEEKS_PER_SHEET * 7 * DAY;
  const pos = (ms: number) => ((ms - from) / span) * 100;
  const now = pos(t(today) + DAY / 2);
  // Em telas menores as colunas de datas somem para as semanas caberem ao lado do painel.
  const cols =
    "grid-cols-[minmax(170px,1.4fr)_64px_minmax(440px,5fr)] 2xl:grid-cols-[minmax(190px,1.8fr)_76px_76px_44px_64px_minmax(440px,5fr)]";
  const dateCol = "hidden 2xl:block";
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[660px] text-sm 2xl:min-w-[960px]">
        <div
          className={cn(
            "grid items-end gap-x-2 border-b pb-1 text-xs font-medium text-muted-foreground",
            cols,
          )}
        >
          <span>Etapa</span>
          <span className={dateCol}>Início</span>
          <span className={dateCol}>Término</span>
          <span className={dateCol}>Dur.</span>
          <span>Avanço</span>
          <div className="grid grid-cols-10 text-center">
            {sh.weeks.map((w) => (
              <span key={w.label} className={cn(w.filler && "opacity-40")}>
                <b className="block text-foreground">{w.label}</b>
                {w.date.slice(8, 10)}/{w.date.slice(5, 7)}
              </span>
            ))}
          </div>
        </div>
        {stages.map((s) => {
          const left = pos(t(s.planned_start!));
          const right = pos(t(s.planned_end || s.planned_start!) + DAY);
          const visible = right > 0 && left < 100;
          const isLate = late.has(s.id);
          const row = sh.rows.find((r) => r.id === s.id);
          const mats = row?.materials ?? [];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={cn(
                "grid w-full items-center gap-x-2 border-b py-1.5 text-left hover:bg-muted/50",
                cols,
                selected === s.id && "bg-primary/5 ring-1 ring-inset ring-primary/40",
              )}
            >
              <span className="truncate font-medium" title={s.name}>
                {s.name}
              </span>
              <span className={cn("text-xs", dateCol)}>{fmtDate(s.planned_start)}</span>
              <span className={cn("text-xs", dateCol)}>{fmtDate(s.planned_end)}</span>
              <span className={cn("text-xs", dateCol)}>
                {weeksBetween(s.planned_start!, s.planned_end || s.planned_start!)}s
              </span>
              <span className="flex items-center gap-1 text-xs tabular-nums">
                <Pie value={s.progress} late={isLate} />
                {fmtNum(s.progress, 0)}%
              </span>
              <div
                className="relative h-6"
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                  backgroundSize: "10% 100%",
                }}
              >
                {sh.realWeeks < WEEKS_PER_SHEET && (
                  <span
                    className="absolute inset-y-0 right-0 bg-muted"
                    style={{ left: `${sh.realWeeks * 10}%` }}
                  />
                )}
                {visible ? (
                  <span
                    className={cn(
                      "absolute inset-y-1 overflow-hidden rounded",
                      isLate ? "bg-destructive/25" : "bg-primary/20",
                    )}
                    style={{
                      left: `${Math.max(0, left)}%`,
                      width: `${Math.max(1.5, Math.min(100, right) - Math.max(0, left))}%`,
                    }}
                  >
                    <i
                      className={cn("block h-full", isLate ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${Math.min(100, Math.max(0, s.progress))}%` }}
                    />
                  </span>
                ) : (
                  <span className="absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">
                    {row?.cell.kind === "done" || row?.cell.kind === "future" ? row.cell.label : ""}
                  </span>
                )}
                {mats.map((m, i) => (
                  <i
                    key={i}
                    className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold ring-2 ring-card"
                    style={{ left: `${m}%` }}
                  />
                ))}
                {now >= 0 && now <= 100 && (
                  <span
                    className="absolute inset-y-0 w-0 border-l-2 border-dashed border-gold"
                    style={{ left: `${now}%` }}
                  />
                )}
              </div>
            </button>
          );
        })}
        {sh.payments.length > 0 && (
          <div className={cn("grid items-center gap-x-2 pt-2.5", cols)}>
            <span className="col-span-2 self-start text-xs font-medium leading-3 text-muted-foreground 2xl:col-span-5">
              Marcos de pagamento
            </span>
            <div className="relative h-8">
              {sh.payments.map((p, i) => (
                <span
                  key={i}
                  title={`${p.label} · ${fmtDate(p.date)} · ${fmtBRL(p.amount)}`}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-[10px]"
                  style={{ left: `${p.at}%` }}
                >
                  <i className="h-2.5 w-2.5 rotate-45 bg-positive" />
                  <span className="mt-0.5 whitespace-nowrap font-medium">{fmtNum(p.pct, 0)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {now >= 0 && now <= 100 && (
          <div className={cn("grid gap-x-2", cols)}>
            <span className="col-span-2 2xl:col-span-5" />
            <div className="relative h-4">
              <span
                className="absolute -translate-x-1/2 rounded bg-gold px-1.5 text-[10px] font-bold text-hero-end"
                style={{ left: `${now}%` }}
              >
                HOJE
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressPanel({
  workId,
  stage,
  stages,
  services,
  history,
  costs,
  needsReason,
  today,
  onClose,
  onSaved,
}: {
  workId: string;
  stage: Stage;
  stages: Stage[];
  services: StageService[];
  history: { before: unknown; after: unknown; changed_at: string; changed_by: string | null }[];
  costs: boolean;
  needsReason: boolean;
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const own = services.filter((s) => s.stage_id === stage.id);
  const computed = own.length ? servicesProgress(own) : null;
  const initialWeeks = weeksBetween(
    stage.planned_start!,
    stage.planned_end || stage.planned_start!,
  );
  const [start, setStart] = useState(stage.planned_start!);
  const [weeks, setWeeks] = useState(initialWeeks);
  const [progress, setProgress] = useState(computed ?? stage.progress);
  const [note, setNote] = useState("");
  const [cascade, setCascade] = useState(true);
  const [busy, setBusy] = useState(false);
  const end =
    weeks === initialWeeks && start === stage.planned_start
      ? stage.planned_end || stage.planned_start!
      : addDaysIso(start, weeks * 7 - 3);
  const expected = stageExpected({ ...stage, planned_start: start, planned_end: end }, today);
  const delta = progress - expected;
  const datesChanged = start !== stage.planned_start || end !== stage.planned_end;
  async function save() {
    setBusy(true);
    try {
      const reason = note.trim() || "Lançamento de avanço";
      if (datesChanged) {
        const changes = shiftStageDates(stages, stage.id, start, end, cascade && costs);
        if (changes.length > 1) {
          const r = await supabase.rpc("shift_work_stages", {
            _work_id: workId,
            _changes: changes,
            _reason: reason,
          });
          if (r.error) throw r.error;
        } else {
          const r = await supabase
            .from("work_stages")
            .update({ planned_start: start, planned_end: end, schedule_change_reason: reason })
            .eq("id", stage.id);
          if (r.error) throw r.error;
        }
      }
      if (computed === null && progress !== stage.progress) {
        const r = await supabase
          .from("work_stages")
          .update({
            progress,
            status: statusForProgress(progress, stage.status),
            ...(note.trim() ? { observations: note.trim(), schedule_change_reason: reason } : {}),
          })
          .eq("id", stage.id);
        if (r.error) throw r.error;
      }
      toast.success("Avanço salvo.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const log = progressHistory(history);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">Lançar avanço</p>
          <h2 className="text-base font-semibold">{stage.name}</h2>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Início
          <Input type="date" value={start} required onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="text-sm">
          Duração (semanas)
          <Input
            type="number"
            min={1}
            max={104}
            value={weeks}
            onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Término: {fmtDate(end)}</p>
      <label className="block text-sm">
        Avanço da etapa: <b>{fmtNum(progress, 0)}%</b>
        <input
          type="range"
          className="mt-2 w-full accent-[var(--primary)]"
          min={0}
          max={100}
          step={5}
          value={progress}
          disabled={computed !== null}
          onChange={(e) => setProgress(Number(e.target.value))}
        />
      </label>
      {computed !== null && (
        <p className="text-xs text-muted-foreground">
          O avanço desta etapa vem dos serviços: lance-o na aba Cronograma da obra.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3 text-sm">
        <span>
          <span className="block text-xs text-muted-foreground">Previsto para hoje</span>
          <b>{fmtNum(expected, 1)}%</b>
        </span>
        <span>
          <span className="block text-xs text-muted-foreground">Situação</span>
          <b className={cn(delta < -5 ? "text-destructive" : delta >= 0 ? "text-positive" : "")}>
            {delta >= 0 ? "+" : ""}
            {fmtNum(delta, 1)} p.p.
          </b>
        </span>
      </div>
      <label className="block text-sm">
        {datesChanged && needsReason ? "Motivo da reprogramação" : "Observação"}
        <textarea
          className="mt-1 min-h-20 w-full rounded-lg border bg-background p-2 text-sm"
          value={note}
          required={datesChanged && needsReason}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {costs && datesChanged && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} />
          Ajustar etapas seguintes automaticamente
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          Salvar avanço
        </Button>
      </div>
      {costs && (
        <div className="border-t pt-3">
          <h3 className="mb-2 text-sm font-semibold">Histórico da etapa</h3>
          {log.length ? (
            <ul className="space-y-2 text-xs">
              {log.slice(0, 8).map((h, i) => (
                <li key={i} className="flex gap-2">
                  <b className="w-10 shrink-0 tabular-nums">{fmtNum(h.progress, 0)}%</b>
                  <span className="text-muted-foreground">
                    {fmtDate(h.date)}
                    {h.note && ` · ${h.note}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum avanço lançado ainda.</p>
          )}
        </div>
      )}
    </form>
  );
}

function PaymentsCard({ payments, today }: { payments: DashPayment[]; today: string }) {
  return (
    <section className={cn(panelClass, "p-4")}>
      <h2 className="mb-3 flex h-8 items-center text-sm font-semibold">Marcos de pagamento</h2>
      {payments.length ? (
        <ul className="space-y-2 text-sm">
          {[...payments]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 6)
            .map((p, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <b className="block truncate">{p.label}</b>
                  <span className="text-xs text-muted-foreground">{fmtDate(p.date)}</span>
                </span>
                <span className="text-right">
                  <span className="block font-medium">{fmtBRL(p.amount)}</span>
                  <PaymentBadge state={paymentState(p, today)} />
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma conta a receber desta obra.</p>
      )}
    </section>
  );
}

function MaterialsCard({
  materials,
  stages,
  onOpen,
}: {
  materials: { id: string; stage_id: string | null; description: string; due_date: string }[];
  stages: Stage[];
  onOpen: () => void;
}) {
  return (
    <section className={cn(panelClass, "p-4")}>
      <div className="mb-3 flex h-8 items-center justify-between">
        <h2 className="text-sm font-semibold">Materiais do cliente</h2>
        <Button type="button" variant="ghost" size="sm" className="-mr-2" onClick={onOpen}>
          Lançar
        </Button>
      </div>
      {materials.length ? (
        <ul className="space-y-2 text-sm">
          {[...materials]
            .sort((a, b) => a.due_date.localeCompare(b.due_date))
            .slice(0, 6)
            .map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <b className="block truncate">{m.description}</b>
                  <span className="text-xs text-muted-foreground">
                    {stages.find((s) => s.id === m.stage_id)?.name ?? "Sem etapa"}
                  </span>
                </span>
                <span className="shrink-0 pt-0.5 text-xs tabular-nums">{fmtDate(m.due_date)}</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma entrega do cliente lançada.</p>
      )}
    </section>
  );
}

type Version = { id: string; version: number; reason: string | null; created_at: string };

function VersionsList({ workId, versions }: { workId: string; versions: Version[] }) {
  if (!versions.length)
    return <p className="text-sm text-muted-foreground">Nenhuma revisão registrada ainda.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {[...versions].reverse().map((v) => (
        <li key={v.id} className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <b>Rev. {String(Math.max(0, v.version - 1)).padStart(2, "0")}</b>
            <span className="block truncate text-xs text-muted-foreground">
              {fmtDate(v.created_at)}
              {v.reason && ` · ${v.reason}`}
            </span>
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/obras/$id/cronograma/pdf"
              params={{ id: workId }}
              search={{ version: v.version }}
            >
              PDF
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

function VersionsCard({ workId, versions }: { workId: string; versions: Version[] }) {
  return (
    <section className={cn(panelClass, "p-4")}>
      <h2 className="mb-3 flex h-8 items-center text-sm font-semibold">Revisões</h2>
      <VersionsList workId={workId} versions={versions.slice(-5)} />
    </section>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CalendarX2,
  FilePlus2,
  HardHat,
  Percent,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { WorkSummary } from "@/lib/dashboard-data";
import { businessDate } from "@/lib/dashboard-math";
import { attentionItems, cashFlowMonths, lastRow, type AttentionKind } from "@/lib/dashboard-home";
import {
  indicatorTotal,
  type CompositionRow,
  type ExecutiveFilter,
  type Indicator,
} from "@/lib/executive";
import { fmtDate, fmtNum } from "@/lib/format";
import { useBRL } from "@/lib/hidden-values";
import { lateStages } from "@/lib/schedule-dashboard";
import {
  FUNNEL_LABEL,
  cashProjection,
  commercialFunnel,
  delinquency,
} from "@/lib/business-indicators";
import { commercialOptions } from "@/lib/commercial-data";
import { inPeriod, periodRange } from "@/lib/dashboard-math";
import type { ExecutiveData } from "@/lib/executive";
import { WorkCard } from "@/components/works/work-card";
import { EmptyState } from "@/components/feedback";
import { KpiCard, Money, Segmented } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/works/fields";
import { panelClass, segmentClass } from "@/lib/surface";
import { cn } from "@/lib/utils";

// Painel inicial (visão executiva): filtros compactos, saldo em caixa com o resumo do período,
// últimas entradas e saídas, a receber/a pagar, obras ativas e valor recebido, fluxo de caixa por
// mês (realizado e previsto), resultado previsto, aditivos, "Atenção" e as obras. Os valores saem
// das mesmas composições dos detalhes (executive.ts), então cartão e detalhe não divergem.

type Compositions = Record<Indicator, CompositionRow[]>;

const PERIODS: [string, string][] = [
  ["mes", "Mês"],
  ["trimestre", "Trimestre"],
  ["ano", "Ano"],
  ["todos", "Todo o período"],
  ["personalizado", "Personalizado"],
];

function CompactFilters({ works }: { works: WorkSummary[] }) {
  const search = useSearch({ strict: false }) as ExecutiveFilter;
  const navigate = useNavigate();
  const target = useLocation().pathname === "/financeiro" ? "/financeiro" : "/painel";
  const set = (key: string, value: string | boolean) =>
    navigate({ to: target, search: (old: Record<string, unknown>) => ({ ...old, [key]: value }) });
  const period = search.period || "todos";
  const clients = [
    ...new Map(works.filter((s) => s.work.client_id).map((s) => [s.work.client_id, s])).values(),
  ];
  return (
    <div className={cn(panelClass, "mb-5 flex flex-wrap items-center gap-2 p-2.5")}>
      <Segmented>
        {PERIODS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={period === v}
            className={cn(
              segmentClass(period === v),
              period === v && "bg-foreground text-background hover:bg-foreground",
            )}
            onClick={() => set("period", v)}
          >
            {l}
          </button>
        ))}
      </Segmented>
      {period === "personalizado" && (
        <>
          <input
            aria-label="Data inicial"
            type="date"
            className={cn(selectClass, "h-9 w-auto")}
            value={search.from || ""}
            onChange={(e) => set("from", e.target.value)}
          />
          <input
            aria-label="Data final"
            type="date"
            className={cn(selectClass, "h-9 w-auto")}
            value={search.to || ""}
            onChange={(e) => set("to", e.target.value)}
          />
        </>
      )}
      <select
        aria-label="Filtro obra"
        className={cn(selectClass, "h-9 w-full py-1 text-sm sm:w-auto sm:max-w-48")}
        value={search.work || ""}
        onChange={(e) => set("work", e.target.value)}
      >
        <option value="">Todas as obras</option>
        {works.map((s) => (
          <option key={s.work.id} value={s.work.id}>
            {s.work.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtro cliente"
        className={cn(selectClass, "h-9 w-full py-1 text-sm sm:w-auto sm:max-w-48")}
        value={search.client || ""}
        onChange={(e) => set("client", e.target.value)}
      >
        <option value="">Todos os clientes</option>
        {clients.map((s) => (
          <option key={s.work.client_id} value={s.work.client_id ?? ""}>
            {s.client}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtro status"
        className={cn(selectClass, "h-9 w-full py-1 text-sm sm:w-auto sm:max-w-48")}
        value={search.status || ""}
        onChange={(e) => set("status", e.target.value)}
      >
        <option value="">Todos os status</option>
        <option value="contratacao">Em planejamento</option>
        <option value="execucao">Em execução</option>
        <option value="pausada">Pausada</option>
        <option value="concluida">Finalizada</option>
      </select>
      <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--primary)]"
          checked={search.pilot || false}
          onChange={(e) => set("pilot", e.target.checked)}
        />
        Incluir PILOTO — TESTE
      </label>
    </div>
  );
}

function LastBox({
  label,
  row,
  empty,
}: {
  label: string;
  row: CompositionRow | null;
  empty: string;
}) {
  const brl = useBRL();
  return (
    <div className="mx-4 mb-4 rounded-xl bg-muted/60 px-3 py-2.5 text-xs sm:mx-5 sm:mb-5">
      <span className="text-muted-foreground">{label}</span>
      {row ? (
        <>
          <b className="block text-sm text-foreground">{brl(Math.abs(row.amount ?? 0))}</b>
          <span className="block truncate text-muted-foreground">
            {[row.work, row.description, row.method, fmtDate(row.date)].filter(Boolean).join(" · ")}
          </span>
        </>
      ) : (
        <>
          <b className="block text-sm text-foreground">—</b>
          <span className="text-muted-foreground">{empty}</span>
        </>
      )}
    </div>
  );
}

function CashFlowChart({ compositions }: { compositions: Compositions }) {
  const brl = useBRL();
  const months = cashFlowMonths(
    {
      received: compositions.received,
      spent: compositions.spent,
      receivable: compositions.receivable,
    },
    businessDate(),
  );
  const max = Math.max(1, ...months.flatMap((m) => [m.received, m.spent, m.forecast]));
  const short = (n: number) =>
    n >= 1000 ? `${fmtNum(Math.round(n / 100) / 10)} mil` : fmtNum(Math.round(n));
  const hatched =
    "repeating-linear-gradient(135deg, color-mix(in oklab, var(--positive) 55%, transparent) 0 4px, color-mix(in oklab, var(--positive) 22%, transparent) 4px 8px)";
  return (
    <section className={cn(panelClass, "flex flex-col p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Fluxo de caixa</h2>
        <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-positive" /> Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-negative" /> Saídas
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ background: hatched }} /> Previsto a
            receber
          </span>
        </span>
      </div>
      <div className="relative mt-4 flex-1">
        <span className="absolute left-0 top-0 text-[10px] text-muted-foreground">
          {brl(max).replace(/,\d+$/, "")}
        </span>
        <div className="absolute inset-x-0 top-2 border-t border-dashed border-border" />
        <div className="grid h-48 grid-cols-7 items-end gap-2 border-b border-border pt-6">
          {months.map((m) => {
            const net = m.received - m.spent;
            return (
              <div key={m.month} className="flex h-full flex-col items-center justify-end">
                {m.current && net !== 0 && (
                  <span
                    className={cn(
                      "mb-1 text-[10px] font-semibold",
                      net > 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {net > 0 ? "+" : "−"}
                    {short(Math.abs(net))}
                  </span>
                )}
                <div
                  className="flex h-full w-full items-end justify-center gap-0.5"
                  title={`${m.label}: entradas ${brl(m.received)} · saídas ${brl(m.spent)} · previsto ${brl(m.forecast)}`}
                >
                  {[
                    { v: m.received, style: { background: "var(--positive)" } },
                    { v: m.spent, style: { background: "var(--negative)" } },
                    { v: m.forecast, style: { background: hatched } },
                  ].map((b, i) =>
                    b.v > 0 ? (
                      <i
                        key={i}
                        className="block w-1/4 max-w-5 rounded-t"
                        style={{ ...b.style, height: `${Math.max(3, (b.v / max) * 100)}%` }}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
          {months.map((m) => (
            <span key={m.month} className={cn(m.current && "font-semibold text-foreground")}>
              {m.label}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Barras listradas = parcelas a receber pelo vencimento (vencidas em aberto contam no mês
        atual).
      </p>
    </section>
  );
}

const ATTENTION_ICON: Record<AttentionKind, typeof Percent> = {
  vencido: CalendarX2,
  atraso: CalendarClock,
  margem: Percent,
  custo: AlertTriangle,
  cronograma: CalendarClock,
};
const ATTENTION_TONE: Record<AttentionKind, string> = {
  vencido: "bg-negative-soft text-negative",
  atraso: "bg-negative-soft text-negative",
  margem: "bg-negative-soft text-negative",
  custo: "bg-alert-soft text-alert",
  cronograma: "bg-primary-soft text-primary",
};

function Attention({
  works,
  company = [],
}: {
  works: WorkSummary[];
  /** Alertas da empresa (ex.: caixa negativo previsto), antes dos das obras. */
  company?: { title: string; detail: string; to: string; action: string }[];
}) {
  const brl = useBRL();
  const today = businessDate();
  const items = attentionItems(
    works.map((s) => {
      const confirmed = s.work.origin !== "direto" || s.result.estimateConfirmed;
      return {
        id: s.work.id,
        name: s.work.name,
        status: s.work.status,
        overdue: s.overdue,
        margin: confirmed && s.result.sale > 0 ? s.result.margin : null,
        minMargin: Number(s.budget.params?.min_margin) || 0,
        costConfirmed: confirmed,
        datedStages: s.stages.filter((x) => x.planned_start).length,
        lateStages: lateStages(s.stages, today).length,
      };
    }),
    brl,
  );
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, Math.max(0, 4 - company.length));
  const totalAlerts = items.length + company.length;
  return (
    <section className={cn(panelClass, "p-4 sm:p-5")}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Atenção</h2>
        {totalAlerts > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-negative-soft px-2 text-xs font-bold text-negative">
            {totalAlerts}
          </span>
        )}
      </div>
      {totalAlerts ? (
        <ul className="divide-y divide-border/60">
          {company.map((c) => (
            <li key={c.title} className="flex gap-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-negative-soft text-negative">
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium leading-snug">{c.title}</p>
                <p className="truncate text-xs text-muted-foreground">{c.detail}</p>
                <Link to={c.to} className="text-xs font-semibold text-primary hover:underline">
                  {c.action} →
                </Link>
              </div>
            </li>
          ))}
          {shown.map((i) => {
            const Icon = ATTENTION_ICON[i.kind];
            return (
              <li key={i.kind + i.workId} className="flex gap-3 py-2.5">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    ATTENTION_TONE[i.kind],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium leading-snug">{i.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.detail}</p>
                  <Link
                    to="/obras/$id"
                    params={{ id: i.workId }}
                    search={{ tab: i.tab }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {i.action} →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Tudo em dia: nenhum alerta nas obras do filtro.
        </p>
      )}
      {items.length > shown.length && !all && (
        <button
          type="button"
          className="mt-1 text-xs font-medium text-primary hover:underline"
          onClick={() => setAll(!all)}
        >
          {`Ver todos (${totalAlerts})`}
        </button>
      )}
    </section>
  );
}

function WorkList({ cards }: { cards: WorkSummary[] }) {
  const brl = useBRL();
  return (
    <div className={cn(panelClass, "overflow-x-auto")}>
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Obra</th>
            <th className="px-3 font-medium">Cliente</th>
            <th className="px-3 text-right font-medium">Valor</th>
            <th className="px-3 text-right font-medium">Recebido</th>
            <th className="px-3 text-right font-medium">Avanço</th>
            <th className="px-4" />
          </tr>
        </thead>
        <tbody>
          {cards.map((s) => (
            <tr key={s.work.id} className="border-t border-border/60">
              <td className="px-4 py-3 font-medium">{s.work.name}</td>
              <td className="px-3 text-muted-foreground">{s.client}</td>
              <td className="px-3 text-right tabular-nums">{brl(s.result.sale)}</td>
              <td className="px-3 text-right tabular-nums">
                {brl(s.totals.received)}{" "}
                <span className="text-xs text-muted-foreground">
                  ({fmtNum(s.balance.financialProgress)}%)
                </span>
              </td>
              <td className="px-3 text-right tabular-nums">{fmtNum(s.progress)}%</td>
              <td className="px-4 text-right">
                <Button size="sm" asChild>
                  <Link to="/obras/$id" params={{ id: s.work.id }}>
                    Abrir obra
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Projection = ReturnType<typeof cashProjection>;

/** R2-1 · saldo projetado por semana (13 semanas ≈ 90 dias) com entradas e saídas previstas. */
function ProjectionCard({ p, cash }: { p: Projection; cash: number }) {
  const brl = useBRL();
  const values = [cash, ...p.weeks.map((w) => w.balance)];
  const hi = Math.max(0, ...values);
  const lo = Math.min(0, ...values);
  const span = hi - lo || 1;
  const W = 520;
  const H = 150;
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / span) * H;
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const negative = !!p.firstNegative;
  return (
    <section className={cn(panelClass, "flex flex-col p-4 sm:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Caixa projetado · 90 dias</h2>
          <p className="text-xs text-muted-foreground">
            Saldo de hoje + a receber − a pagar, pelo vencimento (vencidos contam nesta semana)
          </p>
        </div>
        <Badge variant={negative ? "negative" : "positive"}>
          {negative ? `Negativo em ${fmtDate(p.firstNegative!.start)}` : "Sem saldo negativo"}
        </Badge>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-4 h-36 w-full overflow-visible"
        role="img"
        aria-label={`Saldo projetado: de ${brl(cash)} hoje para ${brl(p.end)} em 90 dias`}
      >
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--border)" strokeDasharray="4 4" />
        <polygon
          points={`0,${y(0)} ${line} ${W},${y(0)}`}
          fill={negative ? "var(--negative)" : "var(--primary)"}
          opacity="0.1"
        />
        <polyline
          points={line}
          fill="none"
          stroke={negative ? "var(--negative)" : "var(--primary)"}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>hoje</span>
        <span>{fmtDate(p.weeks[6]?.start)}</span>
        <span>{fmtDate(p.weeks.at(-1)?.start)}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-xs sm:grid-cols-4">
        {(
          [
            ["Entra", p.inflow, "text-positive"],
            ["Sai", p.outflow, "text-negative"],
            ["Menor saldo", p.min, p.min < 0 ? "text-negative" : ""],
            ["Em 90 dias", p.end, p.end < 0 ? "text-negative" : ""],
          ] as const
        ).map(([l, v, tone]) => (
          <div key={l}>
            <dt className="text-muted-foreground">{l}</dt>
            <dd className={cn("text-sm font-semibold tabular-nums", tone)}>{brl(v)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** R2-2 · funil comercial dos orçamentos (última revisão de cada número). */
function FunnelCard({ f }: { f: ReturnType<typeof commercialFunnel> | null }) {
  const brl = useBRL();
  if (!f)
    return (
      <section className={cn(panelClass, "p-4 text-sm text-muted-foreground sm:p-5")}>
        Carregando funil comercial…
      </section>
    );
  const max = Math.max(1, ...f.stages.map((s) => s.count));
  const tone: Record<string, string> = {
    elaboracao: "bg-muted-foreground/40",
    enviado: "bg-primary/60",
    aprovado: "bg-positive",
    recusado: "bg-negative/70",
  };
  return (
    <section className={cn(panelClass, "flex flex-col p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">Funil comercial</h2>
        <Link to="/orcamentos" className="text-xs font-semibold text-primary hover:underline">
          Orçamentos →
        </Link>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {f.stages.map((s) => (
          <li key={s.stage} className="grid grid-cols-[96px_1fr_auto] items-center gap-2">
            <span className="text-xs text-muted-foreground">{FUNNEL_LABEL[s.stage]}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted">
              <i
                className={cn("block h-full rounded-full", tone[s.stage])}
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </span>
            <span className="text-right text-xs tabular-nums">
              <b>{s.count}</b> · {brl(s.value)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Conversão</dt>
          <dd className="text-lg font-bold">
            {f.conversion === null ? "—" : `${fmtNum(f.conversion)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Até aprovar</dt>
          <dd className="text-lg font-bold">
            {f.avgDaysToApprove === null ? "—" : `${f.avgDaysToApprove} dias`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Em propostas abertas</dt>
          <dd className="font-semibold">{brl(f.openValue)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ticket médio aprovado</dt>
          <dd className="font-semibold">{f.averageTicket === null ? "—" : brl(f.averageTicket)}</dd>
        </div>
      </dl>
      {f.reasons.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Recusas:{" "}
          {f.reasons
            .slice(0, 3)
            .map((r) => `${r.reason} (${r.count})`)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}

/** R2-3 · inadimplência: vencido em aberto sobre o que já deveria ter entrado. */
function DelinquencyCard({ d }: { d: ReturnType<typeof delinquency> }) {
  const brl = useBRL();
  const bad = d.rate >= 10;
  return (
    <section className={cn(panelClass, "flex flex-col p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">Inadimplência</h2>
        <Badge variant={d.overdue ? (bad ? "negative" : "alert") : "positive"}>
          {d.overdue ? `${d.count} ${d.count === 1 ? "parcela" : "parcelas"}` : "Em dia"}
        </Badge>
      </div>
      <p
        className={cn(
          "mt-3 text-3xl font-bold tracking-tight",
          d.overdue ? (bad ? "text-negative" : "text-alert") : "text-positive",
        )}
      >
        {fmtNum(d.rate)}%
      </p>
      <p className="text-xs text-muted-foreground">
        {brl(d.overdue)} vencido de {brl(d.expected)} que já deveria ter entrado
        {d.overdue ? ` · atraso médio de ${d.avgDaysLate} dias` : ""}
      </p>
      {d.byClient.length > 0 && (
        <ul className="mt-3 divide-y divide-border/60 border-t border-border/60 text-sm">
          {d.byClient.slice(0, 4).map((c) => (
            <li key={c.client} className="flex items-center justify-between gap-2 py-2">
              {c.clientId ? (
                <Link
                  to="/cadastros/$id"
                  params={{ id: c.clientId }}
                  className="min-w-0 truncate font-medium hover:text-primary"
                >
                  {c.client}
                </Link>
              ) : (
                <span className="min-w-0 truncate font-medium">{c.client}</span>
              )}
              <span className="shrink-0 text-right text-xs">
                <b className="block tabular-nums text-negative">{brl(c.overdue)}</b>
                <span className="text-muted-foreground">{c.avgDays} dias</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HomeDashboard({
  works,
  allWorks,
  compositions,
  allTime,
  data,
  onDetail,
}: {
  /** Obras do filtro, na ordem dos cards. */
  works: WorkSummary[];
  /** Obras para os seletores do filtro. */
  allWorks: WorkSummary[];
  compositions: Compositions;
  /** Mesmas composições sem o filtro de período (projeção de caixa). */
  allTime: Compositions;
  data: ExecutiveData;
  onDetail: (id: Indicator) => void;
}) {
  const brl = useBRL();
  const search = useSearch({ strict: false }) as ExecutiveFilter;
  const [view, setView] = useState<"cards" | "lista">("cards");
  const total = (id: Indicator) => indicatorTotal(compositions[id]);
  const scope =
    search.period && search.period !== "todos" ? "Período selecionado" : "Todo o período";
  const money = (v: number | null, tone?: "auto") =>
    v === null ? (
      <span className="text-base font-semibold text-muted-foreground">Não conferido</span>
    ) : (
      <Money value={v} tone={tone ?? "inherit"} />
    );
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const active = works.filter((s) => s.work.status !== "concluida");
  const planning = active.filter((s) => s.work.status === "contratacao").length;
  const running = active.filter((s) => s.work.status === "execucao").length;
  const value = total("value") ?? 0;
  const receivedActive = active.reduce((n, s) => n + s.totals.received, 0);
  const pctReceived = value > 0 ? Math.min(100, (receivedActive / value) * 100) : 0;
  const nextReceivable = [...compositions.receivable]
    .filter((r) => r.date)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0];
  const receivableWorks = new Set(compositions.receivable.map((r) => r.workId)).size;
  const overduePayable = compositions.payable.filter((r) => (r.date ?? "") < businessDate()).length;
  const cash = total("cash");
  const today = businessDate();
  // R2-1: projeção a partir do saldo de hoje, sempre com todos os vencimentos (sem filtro de período).
  const cashNow = indicatorTotal(allTime.cash) ?? 0;
  const projection = cashProjection(cashNow, allTime.receivable, allTime.payable, today);
  // R2-2: funil dos orçamentos emitidos no período filtrado.
  const range =
    search.period === "personalizado"
      ? { from: search.from || "", to: search.to || "" }
      : periodRange(search.period || "todos");
  const { data: budgets } = useQuery(commercialOptions(true));
  const funnel = budgets
    ? commercialFunnel(budgets.filter((b) => inPeriod(b.issue_date, range.from, range.to)))
    : null;
  // R2-3: contas a receber das obras do filtro (ou todas, sem filtro de obra/cliente).
  const ids = new Set(works.map((s) => s.work.id));
  const scoped = !!(search.work || search.client || search.status);
  const people = new Map(data.finance.people.map((p) => [p.id, p.name]));
  const receivables = data.finance.entries
    .filter(
      (e) =>
        e.direction === "entrada" &&
        !e.canceled &&
        (!scoped || (e.work_id !== null && ids.has(e.work_id))),
    )
    .map((e) => {
      const w = data.works.find((s) => s.work.id === e.work_id);
      const clientId = w?.work.client_id ?? e.person_id ?? null;
      return {
        id: e.id,
        amount: e.amount,
        due_date: e.due_date,
        client: w?.client ?? (e.person_id ? (people.get(e.person_id) ?? "Cliente") : "Sem cliente"),
        clientId,
      };
    });
  const late = delinquency(receivables, data.finance.settlements, today);
  return (
    <>
      <CompactFilters works={allWorks} />
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr_1fr]">
        <KpiCard
          hero
          label="Saldo em caixa"
          icon={Wallet}
          ariaLabel="Detalhar Saldo em caixa"
          value={money(cash)}
          hint={scope}
          onClick={() => onDetail("cash")}
        >
          <div className="mx-4 mb-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-xs sm:mx-5 sm:mb-5 sm:grid-cols-4">
            {(
              [
                ["Entradas", total("received")],
                ["Saídas", total("spent")],
                ["A receber", total("receivable")],
                ["A pagar", total("payable")],
              ] as const
            ).map(([l, v]) => (
              <div key={l}>
                <span className="text-hero-foreground/70">{l}</span>
                <b className="block text-sm text-hero-foreground">
                  {v === null ? "—" : brl(Math.abs(v))}
                </b>
              </div>
            ))}
          </div>
        </KpiCard>
        <KpiCard
          label="Entradas recebidas"
          icon={ArrowUp}
          tone="positive"
          ariaLabel="Detalhar Entradas recebidas"
          value={money(total("received"))}
          hint={`${scope} · ${count(compositions.received.length, "lançamento", "lançamentos")}`}
          onClick={() => onDetail("received")}
        >
          <LastBox
            label="Última entrada"
            row={lastRow(compositions.received)}
            empty="Nenhuma entrada registrada no período"
          />
        </KpiCard>
        <KpiCard
          label="Saídas pagas"
          icon={ArrowDown}
          tone="negative"
          ariaLabel="Detalhar Saídas pagas"
          value={money(total("spent") === null ? null : Math.abs(total("spent")!))}
          hint={`${scope} · ${compositions.spent.length ? count(compositions.spent.length, "lançamento", "lançamentos") : "nenhum lançamento"}`}
          onClick={() => onDetail("spent")}
        >
          <LastBox
            label="Última saída"
            row={lastRow(compositions.spent)}
            empty="Nenhuma saída registrada no período"
          />
        </KpiCard>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="A receber"
          icon={CalendarClock}
          tone="positive"
          filled
          ariaLabel="Detalhar A receber"
          value={money(total("receivable"))}
          hint={
            nextReceivable
              ? `Próximo: ${brl(nextReceivable.amount ?? 0)} · ${fmtDate(nextReceivable.date)}`
              : `${scope} · ${count(receivableWorks, "obra", "obras")}`
          }
          onClick={() => onDetail("receivable")}
        />
        <KpiCard
          label="Contas a pagar"
          icon={Receipt}
          tone="negative"
          filled
          ariaLabel="Detalhar Contas a pagar"
          value={money(total("payable"))}
          hint={
            overduePayable
              ? `${count(overduePayable, "conta vencida", "contas vencidas")}`
              : `${scope} · nada vencido`
          }
          onClick={() => onDetail("payable")}
        />
        <KpiCard
          label="Obras ativas"
          icon={HardHat}
          ariaLabel="Detalhar Obras ativas"
          value={<span className="num">{fmtNum(total("active") ?? 0)}</span>}
          hint={`${running} em execução · ${planning} em planejamento`}
          onClick={() => onDetail("active")}
        />
        <KpiCard
          label="Valor em obras ativas"
          icon={Building2}
          ariaLabel="Detalhar Valor em obras ativas"
          value={money(total("value"))}
          hint={`Posição acumulada · ${fmtNum(Math.round(pctReceived))}% recebido`}
          onClick={() => onDetail("value")}
        >
          <div className="mx-4 mb-4 h-1.5 overflow-hidden rounded-full bg-muted sm:mx-5 sm:mb-5">
            <i
              className="block h-full rounded-full bg-positive"
              style={{ width: `${pctReceived}%` }}
            />
          </div>
        </KpiCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr_1fr]">
        <CashFlowChart compositions={compositions} />
        <div className="grid gap-4">
          <KpiCard
            label="Resultado previsto das obras"
            icon={TrendingUp}
            tone="brand"
            ariaLabel="Detalhar Resultado previsto das obras"
            value={money(total("result"), "auto")}
            hint={
              total("result") === null ? (
                <span className="flex items-center justify-between gap-2">
                  Posição acumulada
                  <Badge variant="negative">Conferir custos</Badge>
                </span>
              ) : (
                "Posição acumulada · após custos, estrutura e impostos"
              )
            }
            onClick={() => onDetail("result")}
          />
          <KpiCard
            label="Aditivos aprovados"
            icon={FilePlus2}
            tone="extra"
            ariaLabel="Detalhar Aditivos aprovados"
            value={money(total("extras"))}
            hint={`Posição acumulada · ${count(compositions.extras.length, "aditivo", "aditivos")}`}
            onClick={() => onDetail("extras")}
          />
        </div>
        <Attention
          works={works}
          company={
            projection.firstNegative
              ? [
                  {
                    title: `Caixa negativo previsto em ${fmtDate(projection.firstNegative.start)}`,
                    detail: `Menor saldo projetado: ${brl(projection.min)}`,
                    to: "/financeiro",
                    action: "Ver contas",
                  },
                ]
              : []
          }
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr_1fr]">
        <ProjectionCard p={projection} cash={cashNow} />
        <FunnelCard f={funnel} />
        <DelinquencyCard d={late} />
      </div>

      <section aria-labelledby="painel-obras" className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="painel-obras" className="text-xl font-semibold">
              Obras
            </h2>
            <p className="text-xs text-muted-foreground">
              {count(works.length, "obra", "obras")} no filtro · em execução primeiro
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented>
              {(["cards", "lista"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  className={segmentClass(view === v)}
                  onClick={() => setView(v)}
                >
                  {v === "cards" ? "Cards" : "Lista"}
                </button>
              ))}
            </Segmented>
            <Button asChild variant="outline" size="sm">
              <Link to="/obras">
                Todas as obras
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        {!works.length ? (
          <EmptyState
            icon={HardHat}
            title="Nenhuma obra neste filtro"
            description="Ajuste os filtros acima ou cadastre uma nova obra."
          />
        ) : view === "lista" ? (
          <WorkList cards={works} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {works.map((s) => (
              <WorkCard key={s.work.id} s={s} />
            ))}
            <Link
              to="/orcamentos"
              className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-primary shadow-card">
                <Plus className="h-5 w-5" />
              </span>
              <b className="text-foreground">Nova obra</b>a partir de um orçamento aprovado
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch, useLocation } from "@tanstack/react-router";
import {
  ArrowUpRight,
  HardHat,
  Wallet,
  TrendingUp,
  Receipt,
  Clock,
  PlusCircle,
  Landmark,
  Coins,
  FilterX,
} from "lucide-react";
import { dashboardOptions } from "@/lib/dashboard-data";
import { ScheduleSituation } from "@/components/works/schedule-situation";
import {
  executiveComposition,
  indicatorTotal,
  type Indicator,
  type ExecutiveFilter,
  type CompositionRow,
} from "@/lib/executive";
import { fmtBRL, fmtDate, fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { selectClass } from "@/components/works/fields";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export const indicators: { id: Indicator; label: string; icon: typeof HardHat }[] = [
  { id: "active", label: "Obras ativas", icon: HardHat },
  { id: "received", label: "Recebido", icon: Receipt },
  { id: "receivable", label: "A receber", icon: Clock },
  { id: "payable", label: "Contas a pagar", icon: Coins },
  { id: "cash", label: "Caixa", icon: Wallet },
  { id: "result", label: "Resultado previsto das obras", icon: TrendingUp },
  { id: "value", label: "Valor em obras ativas", icon: Landmark },
  { id: "extras", label: "Aditivos aprovados", icon: PlusCircle },
  { id: "spent", label: "Despesas pagas", icon: Receipt },
];
export function ManagementFilters({
  works,
}: {
  works: { work: { id: string; name: string; client_id: string | null }; client: string }[];
}) {
  const search = useSearch({ strict: false }) as ExecutiveFilter;
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const target = pathname === "/financeiro" ? "/financeiro" : "/painel";
  const set = (key: string, value: string | boolean) =>
    navigate({ to: target, search: (old: Record<string, unknown>) => ({ ...old, [key]: value }) });
  const active = !!(
    search.work ||
    search.client ||
    search.status ||
    (search.period && search.period !== "todos") ||
    search.pilot
  );
  return (
    <div className="mb-6 space-y-3 border-y py-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs text-muted-foreground">
          Período
          <select
            aria-label="Período"
            value={search.period || "todos"}
            onChange={(e) => set("period", e.target.value)}
            className={selectClass}
          >
            {[
              ["todos", "Todo o período"],
              ["hoje", "Hoje"],
              ["semana", "Semana"],
              ["mes", "Mês"],
              ["trimestre", "Trimestre"],
              ["ano", "Ano"],
              ["personalizado", "Personalizado"],
            ].map(([v, l]) => (
              <option key={v} value={v || ""}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Obra
          <select
            aria-label="Filtro obra"
            value={search.work || ""}
            onChange={(e) => set("work", e.target.value)}
            className={selectClass}
          >
            <option value="">Todas as obras</option>
            {works.map((s) => (
              <option key={s.work.id} value={s.work.id}>
                {s.work.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Cliente
          <select
            aria-label="Filtro cliente"
            value={search.client || ""}
            onChange={(e) => set("client", e.target.value)}
            className={selectClass}
          >
            <option value="">Todos os clientes</option>
            {[
              ...new Map(
                works.filter((s) => s.work.client_id).map((s) => [s.work.client_id, s]),
              ).values(),
            ].map((s) => (
              <option key={s.work.client_id} value={s.work.client_id ?? ""}>
                {s.client}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Status
          <select
            aria-label="Filtro status"
            value={search.status || ""}
            onChange={(e) => set("status", e.target.value)}
            className={selectClass}
          >
            <option value="">Todos os status</option>
            <option value="contratacao">Em planejamento</option>
            <option value="execucao">Em execução</option>
            <option value="pausada">Pausada</option>
            <option value="concluida">Finalizada</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {search.period === "personalizado" && (
          <>
            <label className="text-xs">
              De
              <input
                aria-label="Data inicial"
                className={selectClass}
                type="date"
                value={search.from || ""}
                onChange={(e) => set("from", e.target.value)}
              />
            </label>
            <label className="text-xs">
              Até
              <input
                aria-label="Data final"
                className={selectClass}
                type="date"
                value={search.to || ""}
                onChange={(e) => set("to", e.target.value)}
              />
            </label>
          </>
        )}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={search.pilot || false}
            onChange={(e) => set("pilot", e.target.checked)}
          />
          Incluir PILOTO — TESTE
        </label>
        {active && (
          <>
            <span className="text-xs font-semibold text-primary">Filtros ativos</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate({ to: target, search: { period: "todos", pilot: false } })}
            >
              <FilterX className="h-4 w-4" />
              Limpar filtros
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
export function OriginLink({ row }: { row: CompositionRow }) {
  return row.workId ? (
    <Button asChild variant="ghost" size="sm" className="h-auto min-h-9 whitespace-normal">
      <Link
        to="/obras/$id"
        params={{ id: row.workId }}
        search={{ tab: row.tab, record: row.recordId || "", entry: row.entryId || "" }}
      >
        {row.work}
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </Button>
  ) : (
    <Button asChild variant="ghost" size="sm">
      <Link to="/financeiro" search={{ entry: row.entryId || "" }}>
        Geral JMG
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </Button>
  );
}
export function CompositionTable({
  rows,
  indicator,
}: {
  rows: CompositionRow[];
  indicator: Indicator;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            {[
              "Data",
              "Obra / origem",
              "Cliente / pessoa",
              "Descrição",
              "Situação / parcela",
              "Valor",
            ].map((h) => (
              <th className="whitespace-nowrap px-3 py-3 font-medium" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="whitespace-nowrap p-3 text-xs">{fmtDate(r.date)}</td>
              <td className="p-2">
                <OriginLink row={r} />
              </td>
              <td className="p-3 text-xs">
                {r.personId ? (
                  <Link to="/cadastros/$id" params={{ id: r.personId }} className="text-primary">
                    {r.client}
                  </Link>
                ) : (
                  r.client
                )}
              </td>
              <td className="min-w-48 p-3">
                {r.description}
                {r.method && <p className="mt-1 text-xs text-muted-foreground">{r.method}</p>}
                {indicator === "extras" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recebido / saldo: {r.paid === null ? "sem vínculo individual" : fmtBRL(r.paid)}
                    {r.pending != null ? " / " + fmtBRL(r.pending) : ""}
                  </p>
                )}
              </td>
              <td className="p-3 text-xs">
                {r.status}
                {r.installment && (
                  <span className="block text-muted-foreground">Parcela {r.installment}</span>
                )}
                {r.paid != null && (
                  <span className="block text-muted-foreground">Baixado {fmtBRL(r.paid)}</span>
                )}
              </td>
              <td className="whitespace-nowrap p-3 text-right font-semibold num">
                {r.amount === null
                  ? "Não conferido"
                  : indicator === "active"
                    ? fmtNum(r.amount)
                    : fmtBRL(r.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum registro neste filtro.
        </p>
      )}
    </div>
  );
}
export function ExecutivePanel() {
  const { data, error } = useQuery(dashboardOptions);
  const search = useSearch({ strict: false }) as ExecutiveFilter & { detail?: Indicator };
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const target = pathname === "/financeiro" ? "/financeiro" : "/painel";
  if (error)
    return (
      <p role="alert" className="text-destructive">
        {error.message}
      </p>
    );
  if (!data) return <p className="py-10 text-muted-foreground">Carregando visão executiva…</p>;
  const compositions = executiveComposition(data, search);
  const detail = indicators.find((x) => x.id === search.detail);
  const rows = detail ? compositions[detail.id] : [];
  const total = indicatorTotal(rows);
  return (
    <section>
      <ManagementFilters works={data.works.filter((s) => search.pilot || !s.work.is_pilot)} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {indicators.map(({ id, label, icon: Icon }) => {
          const value = indicatorTotal(compositions[id]);
          return (
            <Button
              key={id}
              aria-label={`Detalhar ${label}`}
              variant="outline"
              className="h-auto min-h-32 w-full items-start justify-start rounded-lg bg-card p-5 text-left shadow-none"
              onClick={() =>
                navigate({
                  to: target,
                  search: (old: Record<string, unknown>) => ({ ...old, detail: id }),
                })
              }
            >
              <span className="flex w-full min-w-0 flex-col gap-3">
                <span className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="whitespace-normal text-xs font-medium text-muted-foreground">
                  {label}
                </span>
                <span className="whitespace-normal break-words text-lg font-bold num sm:text-xl">
                  {value === null
                    ? "Não conferido"
                    : id === "active"
                      ? fmtNum(value)
                      : fmtBRL(value)}
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {["active", "value", "extras", "result"].includes(id)
                    ? "Posição acumulada"
                    : search.period && search.period !== "todos"
                      ? "Período selecionado"
                      : "Todo o período"}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v)
            navigate({
              to: target,
              search: (old: Record<string, unknown>) => ({ ...old, detail: "" }),
            });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{detail?.label}</DialogTitle>
          </DialogHeader>
          <ManagementFilters works={data.works.filter((s) => search.pilot || !s.work.is_pilot)} />
          <div className="flex flex-wrap justify-between gap-3 border-b pb-4">
            <span className="text-xs text-muted-foreground">
              {rows.length} registros ·{" "}
              {["active", "value", "extras", "result"].includes(detail?.id || "")
                ? "posição acumulada"
                : "composição do período"}
            </span>
            <span className="text-xl font-bold num">
              {total === null
                ? "Não conferido"
                : detail?.id === "active"
                  ? fmtNum(total)
                  : fmtBRL(total)}
            </span>
          </div>
          {detail?.id === "result" && (
            <p className="text-xs text-muted-foreground">
              Resultados das obras · custos gerais não rateados permanecem separados no Financeiro.
            </p>
          )}
          {detail?.id === "receivable" && (
            <p className="text-xs text-muted-foreground">
              Todo o período inclui saldo contratual sem parcelas; períodos específicos incluem
              somente vencimentos detalhados.
            </p>
          )}
          <CompositionTable rows={rows} indicator={detail?.id || "received"} />
          {detail?.id === "active" && (
            <div className="divide-y">
              {rows.map((r) => {
                const s = data.works.find((s) => s.work.id === r.workId);
                return s ? (
                  <section key={r.id} className="py-4">
                    <Link
                      to="/obras/$id"
                      params={{ id: s.work.id }}
                      className="mb-3 block text-sm font-semibold text-primary"
                    >
                      {s.work.name} · {fmtNum(s.progress)}%
                    </Link>
                    <ScheduleSituation
                      workId={s.work.id}
                      stages={s.stages}
                      end={s.work.planned_end}
                    />
                  </section>
                ) : null;
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function FinancialComposition() {
  const { data, error } = useQuery(dashboardOptions);
  const search = useSearch({ strict: false }) as ExecutiveFilter;
  const [indicator, setIndicator] = useState<Indicator>("received");
  if (error)
    return (
      <p role="alert" className="text-destructive">
        {error.message}
      </p>
    );
  if (!data) return <p>Carregando recebimentos e saldos…</p>;
  const rows = executiveComposition(data, search)[indicator];
  const total = indicatorTotal(rows);
  return (
    <section>
      <ManagementFilters works={data.works.filter((s) => search.pilot || !s.work.is_pilot)} />
      <Tabs
        value={indicator}
        onValueChange={(v) => {
          const match = indicators.find((i) => i.id === v);
          if (match) setIndicator(match.id);
        }}
      >
        <TabsList className="h-auto flex-wrap justify-start">
          {indicators
            .filter((i) => ["received", "receivable", "payable", "spent", "cash"].includes(i.id))
            .map((i) => (
              <TabsTrigger key={i.id} value={i.id}>
                {i.label}
              </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>
      <div className="my-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h2 className="font-semibold">{indicators.find((i) => i.id === indicator)?.label}</h2>
        <span className="font-semibold num">
          {total === null ? "Não conferido" : fmtBRL(total)}
        </span>
      </div>
      <CompositionTable rows={rows} indicator={indicator} />
    </section>
  );
}

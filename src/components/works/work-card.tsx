import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, MapPin, User, Wallet } from "lucide-react";
import type { WorkSummary } from "@/lib/dashboard-data";
import { progressAttention } from "@/lib/work-progress";
import { fmtNum } from "@/lib/format";
import { useBRL } from "@/lib/hidden-values";
import { Button } from "@/components/ui/button";
import { Meter, Money } from "@/components/kpi";

const STATUS_LABEL: Record<string, string> = {
  execucao: "Em execução",
  contratacao: "Em planejamento",
  pausada: "Pausada",
  concluida: "Finalizada",
};

/**
 * Card de uma obra no Painel: valor, recebido e custo realizado já calculados em
 * dashboard-data; os percentuais vêm de balance.financialProgress e progressAttention. Faixa azul
 * com a situação e o anel de avanço físico; atalhos para cronograma, financeiro e a obra.
 */
export function WorkCard({ s }: { s: WorkSummary }) {
  const brl = useBRL();
  const unconfirmed = s.work.origin === "direto" && !s.result.estimateConfirmed;
  const { consumed } = progressAttention(
    s.progress,
    s.balance.financialProgress,
    s.incurred,
    unconfirmed ? null : s.result.cost,
  );
  const progress = Math.min(100, Math.max(0, s.progress));
  const minMargin = Number(s.budget.params?.min_margin) || 0;
  const lowMargin =
    !unconfirmed && s.result.sale > 0 && minMargin > 0 && s.result.margin * 100 < minMargin;
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2 bg-gradient-to-br from-hero to-hero-end px-5 py-4 text-hero-foreground">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
            {STATUS_LABEL[s.work.status] ?? s.work.status}
          </span>
          {lowMargin && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-hero-end">
              Margem {fmtNum(Math.round(s.result.margin * 1000) / 10)}%
            </span>
          )}
          {s.overdue > 0 && (
            <span className="rounded-full bg-negative px-2.5 py-1 text-xs font-semibold text-white">
              {brl(s.overdue)} vencido
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--gold) ${progress * 3.6}deg, rgba(255,255,255,.18) 0)`,
            }}
            aria-label={`Avanço ${fmtNum(s.progress)}%`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-hero-end text-xs font-bold num">
              {fmtNum(Math.round(s.progress))}%
            </span>
          </span>
          <span className="mt-0.5 text-[10px] text-hero-foreground/70">avanço</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <Link
          to="/obras/$id"
          params={{ id: s.work.id }}
          aria-label={`Abrir obra ${s.work.name}`}
          className="flex items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="min-w-0">
            <h3 className="text-lg font-bold uppercase leading-tight tracking-tight break-words">
              {s.work.name}
            </h3>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.work.work_type || "Tipo não informado"}
              {s.work.is_pilot ? " · Piloto — teste" : ""}
            </p>
          </div>
          <ChevronRight
            aria-hidden
            className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
        <div className="-mt-2 space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{s.client}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{s.work.address || "Local não informado"}</span>
          </p>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Valor da obra
              </p>
              <p className="text-base font-bold sm:text-lg">
                <Money value={s.result.sale} />
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recebido
              </p>
              <p className="text-base font-bold sm:text-lg">
                <Money value={s.totals.received} tone="positive" />
              </p>
            </div>
          </div>
          <Meter size="sm" showValue={false} value={s.balance.financialProgress} tone="positive" />
          <div className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span className="num">{fmtNum(s.balance.financialProgress)}% recebido</span>
            <span className="num">{brl(s.balance.receivable)} a receber</span>
          </div>
        </div>

        <div className="space-y-2.5 rounded-xl bg-muted/50 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">Custo realizado</span>
            <span className="text-sm font-bold">
              <Money value={s.incurred} tone="negative" />
            </span>
          </div>
          <Meter size="sm" showValue={false} value={consumed} tone="alert" />
          <p className="text-xs text-muted-foreground">
            {consumed === null
              ? "Custo previsto não conferido"
              : `${fmtNum(consumed)}% do custo previsto`}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/obras/$id" params={{ id: s.work.id }} search={{ tab: "cronograma" }}>
              <CalendarDays className="h-4 w-4" />
              Cronograma
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/obras/$id" params={{ id: s.work.id }} search={{ tab: "financeiro" }}>
              <Wallet className="h-4 w-4" />
              Financeiro
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/obras/$id" params={{ id: s.work.id }}>
              Abrir obra
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

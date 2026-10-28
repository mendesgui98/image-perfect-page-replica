import { Link } from "@tanstack/react-router";
import { ArrowUpRight, HardHat, MapPin, User } from "lucide-react";
import type { WorkSummary } from "@/lib/dashboard-data";
import { progressAttention } from "@/lib/work-progress";
import { WORK_STATUS_VARIANT } from "@/lib/status-badges";
import { fmtNum } from "@/lib/format";
import { useBRL } from "@/lib/hidden-values";
import { Badge } from "@/components/ui/badge";
import { Meter, Money } from "@/components/kpi";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  execucao: "Em execução",
  contratacao: "Em planejamento",
  pausada: "Pausada",
  concluida: "Finalizada",
};

/** Faixa do topo na cor da situação (azul em execução, laranja pausada, verde finalizada). */
const STATUS_BAND: Record<string, string> = {
  execucao: "bg-primary-soft text-primary",
  contratacao: "bg-neutral-soft text-muted-foreground",
  pausada: "bg-alert-soft text-alert",
  concluida: "bg-positive-soft text-positive",
};

/**
 * Card de uma obra no Painel: valor, recebido e custo realizado já calculados em
 * dashboard-data; os percentuais vêm de balance.financialProgress e progressAttention.
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
  const band = STATUS_BAND[s.work.status] ?? STATUS_BAND["contratacao"];
  return (
    <Link
      to="/obras/$id"
      params={{ id: s.work.id }}
      aria-label={`Abrir obra ${s.work.name}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card transition-shadow hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className={cn("relative flex items-center gap-2.5 overflow-hidden px-5 py-4", band)}>
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-6 h-32 w-32 rounded-full border-[14px] border-current opacity-[0.07]"
        />
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <HardHat className="h-5 w-5" />
        </span>
        <Badge variant={WORK_STATUS_VARIANT[s.work.status] ?? "neutral"} className="bg-card">
          {STATUS_LABEL[s.work.status] ?? s.work.status}
        </Badge>
        <span className="ml-auto rounded-full bg-card/80 px-2.5 py-1 text-xs font-semibold text-foreground num">
          Avanço {fmtNum(s.progress)}%
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold uppercase leading-tight tracking-tight break-words">
              {s.work.name}
            </h3>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.work.work_type || "Tipo não informado"}
              {s.work.is_pilot ? " · Piloto — teste" : ""}
            </p>
          </div>
          <ArrowUpRight
            aria-hidden
            className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
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

        <div className="mt-auto space-y-1.5 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{s.client}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{s.work.address || "Local não informado"}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { fmtBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Peças visuais do padrão de painéis da JMG. Só apresentam valores já calculados
 * (pricing.ts, operations.ts, executive.ts); nenhuma conta financeira é feita aqui.
 *
 * Significado das cores: positive = entradas/recebimentos, negative = saídas/despesas,
 * alert = vencimentos e pendências, neutral = informação, extra = aditivos, brand = JMG.
 */
export type Tone = "brand" | "positive" | "negative" | "alert" | "neutral" | "extra";

const softTone: Record<Tone, string> = {
  brand: "bg-primary-soft text-primary",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  alert: "bg-alert-soft text-alert",
  neutral: "bg-neutral-soft text-muted-foreground",
  extra: "bg-extra-soft text-extra",
};

const softBg: Record<Tone, string> = {
  brand: "bg-primary-soft",
  positive: "bg-positive-soft",
  negative: "bg-negative-soft",
  alert: "bg-alert-soft",
  neutral: "bg-neutral-soft",
  extra: "bg-extra-soft",
};

const textTone: Record<Tone, string> = {
  brand: "text-primary",
  positive: "text-positive",
  negative: "text-negative",
  alert: "text-alert",
  neutral: "text-foreground",
  extra: "text-extra",
};

/** Ícone dentro de um círculo com o fundo suave da categoria. */
export function IconBubble({
  icon: Icon,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        softTone[tone],
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/**
 * Valor em reais que nunca quebra no meio: "R$" menor e o número junto.
 * `signed` mostra + ou − antes do valor; `tone="auto"` deixa negativos em vermelho.
 */
export function Money({
  value,
  tone = "inherit",
  signed,
  className,
}: {
  value: number;
  tone?: Tone | "auto" | "inherit";
  signed?: "+" | "−";
  className?: string;
}) {
  const negative = value < 0;
  const digits = fmtBRL(Math.abs(value)).replace(/^R\$\s?/, "");
  const sign = signed ?? (negative ? "−" : "");
  const color =
    tone === "inherit" ? "" : tone === "auto" ? (negative ? "text-negative" : "") : textTone[tone];
  return (
    <span className={cn("inline-flex items-baseline whitespace-nowrap num", color, className)}>
      {sign && <span className="mr-1">{sign}</span>}
      <span className="mr-[0.25em] text-[0.62em] font-semibold opacity-70">R$</span>
      {digits}
    </span>
  );
}

/**
 * Card de indicador. `hero` é o destaque da tela (ex.: saldo em caixa); `filled` pinta o
 * fundo com a cor suave da categoria (ex.: a receber em verde claro).
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  filled = false,
  hero = false,
  onClick,
  ariaLabel,
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: ReactNode;
  filled?: boolean;
  hero?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          {Icon &&
            (hero ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            ) : (
              <IconBubble icon={Icon} tone={tone} className={filled ? "bg-card/70" : ""} />
            ))}
          {hero && <span className="text-sm font-medium text-hero-foreground/85">{label}</span>}
        </span>
        {onClick && (
          <ChevronRight
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
              hero ? "text-hero-foreground/70" : "text-muted-foreground/70",
            )}
          />
        )}
      </span>
      {!hero && (
        <span className="-mb-2 block text-[13px] font-medium leading-snug text-muted-foreground">
          {label}
        </span>
      )}
      <span
        className={cn(
          "block font-bold tracking-tight",
          hero
            ? "text-[28px] leading-tight sm:text-4xl xl:text-[44px]"
            : cn("text-base leading-snug @[10rem]:text-lg @[14rem]:text-2xl", textTone[tone]),
        )}
      >
        {value}
      </span>
      {hint && (
        <span
          className={cn(
            "block text-xs",
            hero ? "text-hero-foreground/75" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      )}
    </>
  );
  const shell = cn(
    "group @container flex w-full min-w-0 flex-col gap-3 rounded-2xl p-4 text-left sm:p-5",
    hero
      ? "bg-gradient-to-br from-hero to-hero-end text-hero-foreground shadow-hero"
      : filled
        ? cn("border border-transparent", softBg[tone])
        : "border border-border/70 bg-card shadow-card",
    className,
  );
  if (!onClick)
    return (
      <div className={shell}>
        {body}
        {children}
      </div>
    );
  return (
    <div className={cn(shell, "p-0 sm:p-0")}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={cn(
          "flex w-full min-w-0 flex-1 cursor-pointer flex-col gap-3 rounded-2xl p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:p-5",
          hero ? "hover:bg-white/5" : "hover:bg-foreground/[0.025]",
        )}
      >
        {body}
      </button>
      {children}
    </div>
  );
}

/** Seletor em "pílulas" (abas leves) para alternar visões da mesma tela. */
export function Segmented({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

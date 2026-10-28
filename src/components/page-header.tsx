import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/feedback";
import { cn } from "@/lib/utils";

/**
 * Faixa de topo no estilo da capa do orçamento: azul da marca → azul-marinho e detalhe dourado.
 * Textos e botões de dentro são ajustados para o fundo escuro: a ação principal fica dourada e
 * as secundárias claras.
 */
export function PageBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative isolate mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-hero to-hero-end px-5 py-6 text-hero-foreground shadow-hero md:mb-8 md:px-8 md:py-8",
        "[&_.text-foreground]:text-hero-foreground [&_.text-muted-foreground]:text-hero-foreground/75 [&_.text-primary]:text-gold [&_.bg-neutral-soft]:bg-white/10 [&_.text-destructive]:text-negative-soft",
        "[&_.bg-primary]:bg-gold [&_.bg-primary]:text-hero-end [&_.bg-primary]:hover:bg-gold/90",
        "[&_.bg-card]:border-white/25 [&_.bg-card]:bg-white/10 [&_.bg-card]:text-hero-foreground [&_.bg-card]:hover:bg-white/20",
      )}
    >
      <span
        aria-hidden
        className="absolute left-5 top-0 h-1 w-12 rounded-b-full bg-gold md:left-8"
      />
      <div className={className}>{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <PageBand className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </PageBand>
  );
}

export function NoAccess() {
  return (
    <EmptyState
      icon={Lock}
      title="Acesso restrito"
      description="Seu perfil não tem acesso a custos e preços. Peça ao administrador."
    />
  );
}

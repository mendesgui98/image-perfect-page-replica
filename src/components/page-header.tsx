import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/feedback";

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-foreground md:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
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

import { Link } from "@tanstack/react-router";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/painel" className="flex items-center gap-2.5 rounded-md outline-none">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary p-1.5 shadow-sm">
        <img src="/jmg-logo-white.png" alt="" className="h-full w-full object-contain" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-brand text-[15px] font-extrabold tracking-tight text-foreground">
            JMG Reformas
          </span>
          <span className="block text-xs text-muted-foreground">Gestão de obras</span>
        </span>
      )}
    </Link>
  );
}

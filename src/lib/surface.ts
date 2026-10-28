import { cn } from "@/lib/utils";

/** Painel suave usado para agrupar filtros e listas sem linhas duplas. */
export const panelClass = "rounded-2xl border border-border/70 bg-card shadow-card";

/** Item do seletor em pílulas (`Segmented`); `active` marca a visão atual. */
export const segmentClass = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4",
    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
  );

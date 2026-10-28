import { Link, useLocation } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { isMac, openSearch } from "@/lib/command-palette";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { SETTINGS_ITEM, isActive, visibleGroups, type NavColor, type NavItem } from "./nav-config";
import { UserMenu } from "./user-menu";

/** Ícone de cada módulo num quadradinho em um tom de azul do seu grupo. */
const NAV_CHIP: Record<NavColor, string> = {
  blue: "bg-blue-500/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
  indigo: "bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
  sky: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  slate: "bg-slate-500/12 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
};

export function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: (() => void) | undefined;
}) {
  const { pathname } = useLocation();
  const active = isActive(pathname, item.to);
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-xl px-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "bg-gradient-to-r from-hero to-hero-end font-semibold text-hero-foreground shadow-hero"
          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
          active ? "bg-white/18 text-hero-foreground" : NAV_CHIP[item.color ?? "slate"],
        )}
      >
        <item.icon className="h-4 w-4" />
      </span>
      {item.label}
    </Link>
  );
}

/** Lista de navegação agrupada (usada na barra lateral e no menu "Mais" do celular). */
export function NavGroups({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { data: me } = useMe();
  return (
    <nav className="space-y-5" aria-label="Navegação principal">
      {visibleGroups(!!me?.canSeeCosts).map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-primary/70">
            {g.label}
          </p>
          <div className="space-y-1">
            {g.items.map((item) => (
              <NavLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function SearchButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openSearch}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-xl border border-sidebar-border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none",
        className,
      )}
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Buscar…</span>
      <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline">
        {isMac() ? "⌘" : "Ctrl"} K
      </kbd>
    </button>
  );
}

export function AppSidebar({ onSignOut }: { onSignOut: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar bg-gradient-to-b from-sidebar to-sidebar-end lg:flex">
      <div className="px-4 pt-5 pb-4">
        <Brand />
      </div>
      <div className="px-3 pb-4">
        <SearchButton />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <NavGroups />
      </div>
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <NavLink item={SETTINGS_ITEM} />
        <UserMenu onSignOut={onSignOut} full />
      </div>
    </aside>
  );
}

import { Link, useLocation } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { isMac, openSearch } from "@/lib/command-palette";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { SETTINGS_ITEM, isActive, visibleGroups, type NavItem } from "./nav-config";
import { UserMenu } from "./user-menu";

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
        "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0",
          active
            ? "text-sidebar-accent-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      />
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
          <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {g.label}
          </p>
          <div className="space-y-0.5">
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
        "flex h-9 w-full items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none",
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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
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

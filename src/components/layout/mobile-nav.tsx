import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { openSearch } from "@/lib/command-palette";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Brand } from "./brand";
import { NavGroups, NavLink } from "./app-sidebar";
import { SETTINGS_ITEM, isActive, mobileTabs } from "./nav-config";
import { UserMenu } from "./user-menu";

/** Barra superior no celular/tablet: marca, busca e menu do usuário. */
export function MobileTopBar({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:hidden">
      <Brand />
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={openSearch} aria-label="Buscar">
          <Search className="h-[18px] w-[18px]" />
        </Button>
        <UserMenu onSignOut={onSignOut} />
      </div>
    </header>
  );
}

/** Barra inferior fixa no celular, pensada para uso com uma mão em obra. */
export function MobileTabBar() {
  const { pathname } = useLocation();
  const { data: me } = useMe();
  const [more, setMore] = useState(false);
  const tabs = mobileTabs(!!me?.canSeeCosts);
  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
      active ? "text-primary" : "text-muted-foreground",
    );
  return (
    <>
      <nav
        aria-label="Navegação rápida"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      >
        <div className="mx-auto flex max-w-lg">
          {tabs.map((t) => {
            const active = isActive(pathname, t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={tabClass(active)}
                aria-current={active ? "page" : undefined}
              >
                <t.icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                {t.label}
              </Link>
            );
          })}
          <button type="button" className={tabClass(more)} onClick={() => setMore(true)}>
            <Menu className="h-5 w-5" />
            Mais
          </button>
        </div>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto p-4">
          <SheetHeader className="mb-4 p-0 text-left">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Brand />
          </SheetHeader>
          <NavGroups onNavigate={() => setMore(false)} />
          <div className="mt-5 border-t pt-3">
            <NavLink item={SETTINGS_ITEM} onNavigate={() => setMore(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

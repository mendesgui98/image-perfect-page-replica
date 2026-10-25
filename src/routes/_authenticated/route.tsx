import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, FileText, Users, Wrench, Package, Layers, Settings, LogOut, Menu, X, HardHat, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/dashboard", label: "Obras e resultados", icon: LayoutDashboard, costs: true },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText, costs: true },
  { to: "/obras", label: "Obras", icon: HardHat },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, costs: true },
  { to: "/cadastros", label: "Cadastros", icon: Users },
  { to: "/servicos", label: "Serviços", icon: Wrench, costs: true },
  { to: "/materiais", label: "Materiais", icon: Package, costs: true },
  { to: "/etapas", label: "Etapas e categorias", icon: Layers },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function Shell() {
  const { pathname } = useLocation();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (pathname.endsWith("/pdf")) return <Outlet />;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.filter((n) => !("costs" in n) || me?.canSeeCosts).map((n) => {
        const active = pathname.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 px-2">
      <img src="/jmg-logo-white.png" alt="JMG" className="h-9 w-9 object-contain" />
      <div className="leading-tight">
        <div className="font-display text-base font-extrabold">JMG Reformas</div>
        <div className="text-xs opacity-70">Gestão de obras</div>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-sidebar-border pt-4 text-sm">
      <div className="truncate px-2 font-medium">{me?.name}</div>
      <div className="px-2 text-xs capitalize opacity-70">{me?.roles.join(", ") || "sem perfil"}</div>
      <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent/60">
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        {brand}
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-2">
          <Menu className="h-6 w-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex w-72 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
            <div className="flex items-center justify-between">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
          <div className="flex-1 bg-foreground/40" onClick={() => setOpen(false)} />
        </div>
      )}
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

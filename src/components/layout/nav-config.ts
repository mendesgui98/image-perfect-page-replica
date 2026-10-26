import {
  CalendarDays,
  FileSignature,
  FileText,
  HardHat,
  LayoutDashboard,
  Layers,
  Package,
  Settings,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Só administrador e financeiro (custos e preços). */
  costs?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Visão geral", items: [{ to: "/painel", label: "Painel", icon: LayoutDashboard }] },
  {
    label: "Comercial",
    items: [
      { to: "/orcamentos", label: "Orçamentos", icon: FileText, costs: true },
      { to: "/contratos", label: "Contratos", icon: FileSignature, costs: true },
    ],
  },
  {
    label: "Execução",
    items: [
      { to: "/obras", label: "Obras", icon: HardHat },
      { to: "/cronogramas", label: "Cronogramas", icon: CalendarDays },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/financeiro", label: "Financeiro", icon: Wallet, costs: true },
      { to: "/cadastros", label: "Cadastros", icon: Users },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/servicos", label: "Serviços", icon: Wrench, costs: true },
      { to: "/materiais", label: "Materiais", icon: Package, costs: true },
      { to: "/etapas", label: "Etapas e categorias", icon: Layers },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  to: "/configuracoes",
  label: "Configurações",
  icon: Settings,
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  equipe: "Equipe de obra",
};

export function visibleGroups(canSeeCosts: boolean) {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.costs || canSeeCosts),
  })).filter((g) => g.items.length);
}

/** Itens da barra inferior no celular (o 5º botão é "Mais"). */
export function mobileTabs(canSeeCosts: boolean): NavItem[] {
  const by = (to: string) => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.to === to)!;
  return canSeeCosts
    ? [by("/painel"), by("/obras"), by("/orcamentos"), by("/financeiro")]
    : [by("/painel"), by("/obras"), by("/cronogramas"), by("/cadastros")];
}

export const isActive = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

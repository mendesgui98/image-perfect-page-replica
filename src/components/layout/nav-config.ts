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
  /** Cor de identidade do módulo no menu (só aparência). */
  color?: NavColor;
};
export type NavColor =
  "blue" | "indigo" | "violet" | "orange" | "teal" | "emerald" | "pink" | "sky" | "amber" | "slate";
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ to: "/painel", label: "Painel", icon: LayoutDashboard, color: "blue" }],
  },
  {
    label: "Comercial",
    items: [
      { to: "/orcamentos", label: "Orçamentos", icon: FileText, costs: true, color: "indigo" },
      { to: "/contratos", label: "Contratos", icon: FileSignature, costs: true, color: "violet" },
    ],
  },
  {
    label: "Execução",
    items: [
      { to: "/obras", label: "Obras", icon: HardHat, color: "orange" },
      { to: "/cronogramas", label: "Cronogramas", icon: CalendarDays, color: "teal" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/financeiro", label: "Financeiro", icon: Wallet, costs: true, color: "emerald" },
      { to: "/cadastros", label: "Cadastros", icon: Users, color: "pink" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/servicos", label: "Serviços", icon: Wrench, costs: true, color: "sky" },
      { to: "/materiais", label: "Materiais", icon: Package, costs: true, color: "amber" },
      { to: "/etapas", label: "Etapas e categorias", icon: Layers, color: "slate" },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  to: "/configuracoes",
  label: "Configurações",
  icon: Settings,
  color: "slate",
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

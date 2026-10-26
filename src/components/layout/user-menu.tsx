import { Link } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, Monitor, Moon, Settings, ShieldCheck, Sun } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL } from "./nav-config";
import { initials } from "@/lib/initials";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
];

/** Menu do usuário: perfil, tema, configurações e sair. `full` mostra nome e papel ao lado. */
export function UserMenu({ onSignOut, full = false }: { onSignOut: () => void; full?: boolean }) {
  const { data: me } = useMe();
  const { preference, setPreference } = useTheme();
  const name = me?.name || me?.email || "";
  const role = me?.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") || "Sem perfil";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          full ? "w-full p-2" : "p-1",
        )}
        aria-label="Menu do usuário"
      >
        <Avatar name={name} />
        {full && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">{role}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={full ? "start" : "end"}
        side={full ? "top" : "bottom"}
        className="w-60"
      >
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{me?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/configuracoes" hash="seguranca">
            <ShieldCheck className="mr-2 h-4 w-4" /> Segurança e 2FA
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Tema
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(v) => setPreference(v as ThemePreference)}
        >
          {THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.value} value={t.value}>
              <t.icon className="mr-2 h-4 w-4" />
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

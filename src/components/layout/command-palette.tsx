import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileText, HardHat, Monitor, Moon, Plus, Sun, User } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { OPEN_SEARCH_EVENT } from "@/lib/command-palette";
import { relationshipOptions } from "@/lib/relationship-data";
import { useTheme } from "@/lib/theme";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SETTINGS_ITEM, visibleGroups } from "./nav-config";

const KIND_LABEL: Record<string, string> = {
  cliente: "Cliente",
  contato: "Contato",
  arquiteto: "Arquiteto",
  fornecedor: "Fornecedor",
  prestador: "Prestador",
};
const LIMIT = 8;

/** Busca rápida (Cmd/Ctrl+K): páginas, obras, pessoas, orçamentos e ações. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { setPreference } = useTheme();
  const { data } = useQuery({ ...relationshipOptions(!!me?.canSeeCosts), enabled: open });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function go(to: string, params?: Record<string, string>, search?: Record<string, string>) {
    setOpen(false);
    navigate({ to, params, search } as never);
  }

  const searching = query.trim().length >= 2;
  const works = (data?.works ?? []).filter((w) => !w.archived).slice(0, searching ? 50 : LIMIT);
  const people = (data?.people ?? []).filter((p) => !p.deleted_at);
  const budgets = (data?.budgets ?? []).filter((b) => !b.deleted_at);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] max-w-xl translate-y-0 overflow-hidden p-0 shadow-elevated">
        <DialogTitle className="sr-only">Busca rápida</DialogTitle>
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:gap-2.5 [&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:py-2.5"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar obra, cliente, orçamento ou página…"
          />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>Nada encontrado para “{query}”.</CommandEmpty>

            <CommandGroup heading="Ir para">
              {[...visibleGroups(!!me?.canSeeCosts).flatMap((g) => g.items), SETTINGS_ITEM].map(
                (item) => (
                  <CommandItem
                    key={item.to}
                    value={`pagina ${item.label}`}
                    onSelect={() => go(item.to)}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </CommandItem>
                ),
              )}
            </CommandGroup>

            {works.length > 0 && (
              <CommandGroup heading="Obras">
                {works.map((w) => (
                  <CommandItem
                    key={w.id}
                    value={`obra ${w.name} ${w.address ?? ""} ${w.id}`}
                    onSelect={() => go("/obras/$id", { id: w.id })}
                  >
                    <HardHat className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{w.name}</span>
                    {w.address && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {w.address}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searching && people.length > 0 && (
              <CommandGroup heading="Pessoas">
                {people.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`pessoa ${p.name} ${p.phone ?? ""} ${p.email ?? ""} ${p.id}`}
                    onSelect={() => go("/cadastros/$id", { id: p.id })}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {KIND_LABEL[p.kind] ?? p.kind}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searching && budgets.length > 0 && (
              <CommandGroup heading="Orçamentos">
                {budgets.map((b) => (
                  <CommandItem
                    key={b.id}
                    value={`orcamento ${b.number} ${b.title} ${b.client_display} ${b.id}`}
                    onSelect={() => go("/orcamentos/$id", { id: b.id })}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      Nº {b.number}
                      {b.revision ? ` rev. ${b.revision}` : ""} · {b.title}
                    </span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {b.client_display}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />
            <CommandGroup heading="Ações">
              {me?.canSeeCosts && (
                <CommandItem value="acao novo orcamento" onSelect={() => go("/orcamentos")}>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  Novo orçamento
                </CommandItem>
              )}
              <CommandItem
                value="acao tema claro"
                onSelect={() => (setPreference("light"), setOpen(false))}
              >
                <Sun className="h-4 w-4 text-muted-foreground" /> Tema claro
              </CommandItem>
              <CommandItem
                value="acao tema escuro"
                onSelect={() => (setPreference("dark"), setOpen(false))}
              >
                <Moon className="h-4 w-4 text-muted-foreground" /> Tema escuro
              </CommandItem>
              <CommandItem
                value="acao tema automatico sistema"
                onSelect={() => (setPreference("system"), setOpen(false))}
              >
                <Monitor className="h-4 w-4 text-muted-foreground" /> Tema automático
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

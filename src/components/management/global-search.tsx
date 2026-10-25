import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { relationshipOptions } from "@/lib/relationship-data";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data: me } = useMe();
  const { data, error } = useQuery({ ...relationshipOptions(!!me?.canSeeCosts), enabled: open });
  const matches = (s: string) => q.trim().length > 1 && s.toLowerCase().includes(q.toLowerCase());
  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Buscar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buscar na JMG</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Busca global"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Obra, pessoa, orçamento ou contrato"
          />
          {error && <p className="text-destructive">{error.message}</p>}
          <div className="divide-y">
            {data?.works
              .filter((w) => matches(w.name + " " + (w.address || "")))
              .map((w) => (
                <Link
                  key={w.id}
                  to="/obras/$id"
                  params={{ id: w.id }}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm"
                >
                  <span className="block text-xs text-muted-foreground">Obra</span>
                  {w.name}
                </Link>
              ))}
            {data?.people
              .filter((p) => !p.deleted_at && matches(p.name + " " + (p.phone || "")))
              .map((p) => (
                <Link
                  key={p.id}
                  to="/cadastros/$id"
                  params={{ id: p.id }}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm"
                >
                  <span className="block text-xs text-muted-foreground">{p.kind}</span>
                  {p.name}
                </Link>
              ))}
            {data?.budgets
              .filter(
                (b) =>
                  !b.deleted_at &&
                  matches(String(b.number) + " " + b.title + " " + b.client_display),
              )
              .map((b) => (
                <Link
                  key={b.id}
                  to="/orcamentos/$id"
                  params={{ id: b.id }}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm"
                >
                  <span className="block text-xs text-muted-foreground">Orçamento #{b.number}</span>
                  {b.title} · {b.client_display}
                </Link>
              ))}
            {data?.contracts
              .filter(
                (c) =>
                  !c.deleted_at &&
                  matches(
                    c.status + " " + (data.works.find((w) => w.id === c.work_id)?.name || ""),
                  ),
              )
              .map((c) => (
                <Link
                  key={c.id}
                  to="/obras/$id"
                  params={{ id: c.work_id }}
                  search={{ tab: "contrato" }}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm"
                >
                  <span className="block text-xs text-muted-foreground">Contrato · {c.status}</span>
                  {data.works.find((w) => w.id === c.work_id)?.name}
                </Link>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

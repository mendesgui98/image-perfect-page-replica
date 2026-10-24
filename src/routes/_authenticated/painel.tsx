import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/budget-status";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — JMG Reformas" }] }),
  component: Painel,
});

function Painel() {
  const { data: me } = useMe();
  const { data } = useQuery({
    queryKey: ["painel", me?.canSeeCosts],
    enabled: !!me,
    queryFn: async () => {
      const [company, pricing, budgets, people] = await Promise.all([
        supabase.from("company_settings").select("*").maybeSingle(),
        me!.canSeeCosts ? supabase.from("pricing_settings").select("configured").maybeSingle() : Promise.resolve({ data: null }),
        me!.canSeeCosts
          ? supabase.from("budgets").select("id,number,revision,title,client_display,status,updated_at").eq("archived", false).order("updated_at", { ascending: false }).limit(8)
          : Promise.resolve({ data: [] }),
        supabase.from("people").select("kind", { count: "exact" }).eq("active", true),
      ]);
      return { company: company.data, pricing: pricing.data, budgets: budgets.data ?? [], people: people.data ?? [] };
    },
  });

  const alerts: string[] = [];
  if (me?.canSeeCosts && data && !data.pricing?.configured)
    alerts.push("As regras de precificação ainda não foram configuradas. Configure antes de emitir o primeiro orçamento real.");
  if (data?.company && !data.company.email) alerts.push("O e-mail da JMG não está cadastrado nos dados da empresa.");

  const count = (k: string) => data?.people.filter((p) => p.kind === k).length ?? 0;

  return (
    <div>
      <PageHeader
        title={`Olá${me?.name ? ", " + me.name.split(" ")[0] : ""}`}
        subtitle="Etapa 1: cadastros, catálogo, precificação e orçamento em PDF."
        actions={
          me?.canSeeCosts && (
            <Button asChild>
              <Link to="/orcamentos">
                <Plus className="h-4 w-4" /> Novo orçamento
              </Link>
            </Button>
          )
        }
      />
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <div key={a} className="flex items-start gap-3 rounded-lg border border-warning bg-warning/15 p-3 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {a}{" "}
                <Link to="/configuracoes" className="font-semibold underline">
                  Abrir configurações
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Clientes", count("cliente")],
          ["Arquitetos", count("arquiteto")],
          ["Fornecedores", count("fornecedor")],
          ["Prestadores", count("prestador")],
        ].map(([l, v]) => (
          <Card key={l as string} className="shadow-card">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{l}</div>
              <div className="font-display text-3xl font-extrabold text-primary">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {me?.canSeeCosts && (
        <Card className="mt-6 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Orçamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {data?.budgets.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum orçamento ainda.</p>}
            {data?.budgets.map((b) => (
              <Link key={b.id} to="/orcamentos/$id" params={{ id: b.id }} className="flex items-center gap-3 px-6 py-3 hover:bg-muted">
                <FileText className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    Nº {b.number}
                    {b.revision ? ` · Rev. ${b.revision}` : ""} — {b.client_display || b.title}
                  </div>
                  <div className="text-xs text-muted-foreground">Atualizado em {fmtDate(b.updated_at)}</div>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{STATUS_LABEL[b.status]}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

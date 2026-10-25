import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { dashboardSearch } from "@/components/works/dashboard";
import { ExecutivePanel } from "@/components/management/executive";
import { WorkOverview } from "@/components/works/overview";

export const Route = createFileRoute("/_authenticated/painel")({
  validateSearch: (
    s: Record<string, unknown>,
  ): ReturnType<typeof dashboardSearch> & { detail?: string } => ({
    ...dashboardSearch(s),
    detail: typeof s["detail"] === "string" ? s["detail"] : "",
  }),
  head: () => pageMeta("Painel", "Acompanhamento de obras, propostas e alertas da JMG."),
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
        me?.canSeeCosts
          ? supabase.from("pricing_settings").select("configured").maybeSingle()
          : Promise.resolve({ data: null }),
        me?.canSeeCosts
          ? supabase
              .from("budgets")
              .select("id,number,revision,title,client_display,status,updated_at")
              .is("deleted_at", null)
              .eq("archived", false)
              .order("updated_at", { ascending: false })
              .limit(8)
          : Promise.resolve({ data: [] }),
        supabase
          .from("people")
          .select("kind", { count: "exact" })
          .is("deleted_at", null)
          .eq("active", true),
      ]);
      return {
        company: company.data,
        pricing: pricing.data,
        budgets: budgets.data ?? [],
        people: people.data ?? [],
      };
    },
  });

  const alerts: string[] = [];
  if (me?.canSeeCosts && data && !data.pricing?.configured)
    alerts.push(
      "As regras de precificação ainda não foram configuradas. Configure antes de emitir o primeiro orçamento real.",
    );
  if (data?.company && !data.company.email)
    alerts.push("O e-mail da JMG não está cadastrado nos dados da empresa.");

  return (
    <div>
      <PageHeader
        title="JMG Reformas"
        subtitle="Visão executiva"
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
            <div
              key={a}
              className="flex items-start gap-3 rounded-lg border border-warning bg-warning/15 p-3 text-sm text-warning-foreground"
            >
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
      {me?.canSeeCosts ? <ExecutivePanel /> : <WorkOverview />}
    </div>
  );
}

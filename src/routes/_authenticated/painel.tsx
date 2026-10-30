import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { useMfa } from "@/hooks/use-mfa";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { dashboardSearch } from "@/lib/dashboard-search";
import { ExecutivePanel } from "@/components/management/executive";
import { HideValuesScope, HideValuesToggle } from "@/components/hidden-values";
import { WorkOverview } from "@/components/works/overview";
import { FieldPanel } from "@/components/works/field-panel";
import { businessDate } from "@/lib/dashboard-math";
import { greeting, longDate } from "@/lib/dashboard-home";

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

  const mfa = useMfa(!!me?.isAdmin);
  const alerts: string[] = [];
  if (me?.isAdmin && mfa.data && !mfa.data.enabled)
    alerts.push(
      "Sua conta de administrador está sem verificação em duas etapas. Ative em Configurações > Segurança.",
    );
  if (me?.canSeeCosts && data && !data.pricing?.configured)
    alerts.push(
      "As regras de precificação ainda não foram configuradas. Configure antes de emitir o primeiro orçamento real.",
    );
  if (data?.company && !data.company.email)
    alerts.push("O e-mail da JMG não está cadastrado nos dados da empresa.");

  return (
    <div>
      {me?.canSeeCosts ? (
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {greeting(new Date().getHours())}
              {me.name ? `, ${me.name.split(/[\s@]/)[0]}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              {longDate(businessDate())} · visão geral da JMG Reformas
            </p>
          </div>
          {/* Celular: olho + entrada + saída numa linha e "Novo orçamento" na largura toda. */}
          <div className="grid w-full grid-cols-[auto_1fr_1fr] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <HideValuesToggle />
            <Button variant="outline" asChild>
              <Link to="/financeiro" search={{ view: "lancamentos", novo: "entrada" }}>
                <Plus className="h-4 w-4 text-positive" /> Lançar entrada
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/financeiro" search={{ view: "lancamentos", novo: "saida" }}>
                <Plus className="h-4 w-4 text-negative" /> Lançar saída
              </Link>
            </Button>
            <Button className="col-span-3 bg-gold text-hero-end hover:bg-gold/90" asChild>
              <Link to="/orcamentos">
                <Plus className="h-4 w-4" /> Novo orçamento
              </Link>
            </Button>
          </div>
        </header>
      ) : (
        <PageHeader title="JMG Reformas" subtitle="Equipe de campo" />
      )}
      {alerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {alerts.map((a) => (
            <div
              key={a}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-warning bg-warning/15 px-4 py-2.5 text-sm text-warning-foreground"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 self-start sm:self-center" />
              <span className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-auto">{a}</span>
              <Link to="/configuracoes" className="ml-7 font-semibold underline sm:ml-0">
                Abrir configurações
              </Link>
            </div>
          ))}
        </div>
      )}
      {me?.canSeeCosts ? (
        <HideValuesScope>
          <ExecutivePanel />
        </HideValuesScope>
      ) : (
        <>
          <FieldPanel />
          <WorkOverview />
        </>
      )}
    </div>
  );
}

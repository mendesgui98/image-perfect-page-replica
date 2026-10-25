import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, NoAccess } from "@/components/page-header";
import { Finance } from "@/components/works/finance";
import { useMe } from "@/hooks/use-me";
import { FinancialDashboard, dashboardSearch } from "@/components/works/dashboard";
import { FinancialComposition } from "@/components/management/executive";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/financeiro")({
  validateSearch: (
    s: Record<string, unknown>,
  ): ReturnType<typeof dashboardSearch> & { view?: string; entry?: string; detail?: string } => ({
    ...dashboardSearch(s),
    view: typeof s["view"] === "string" ? s["view"] : "lancamentos",
    entry: typeof s["entry"] === "string" ? s["entry"] : "",
    detail: typeof s["detail"] === "string" ? s["detail"] : "",
  }),
  head: () => pageMeta("Financeiro", "Contas, caixa, pagamentos, recebimentos e rateios da JMG."),
  component: Page,
});
function Page() {
  const { data: me } = useMe();
  const search = Route.useSearch();
  if (!me) return null;
  if (!me.canSeeCosts) return <NoAccess />;
  return (
    <div>
      <PageHeader title="Financeiro" />
      <nav className="mb-6 flex flex-wrap gap-2">
        {[
          ["lancamentos", "Lançamentos e contas"],
          ["composicao", "Recebimentos e saldos"],
          ["analise", "Análises e resultados"],
        ].map(([view, label]) => (
          <Button key={view} variant={search.view === view ? "default" : "outline"} asChild>
            <Link to="/financeiro" search={{ ...search, view: view || "lancamentos" }}>
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      {search.view === "analise" ? (
        <FinancialDashboard />
      ) : search.view === "composicao" ? (
        <FinancialComposition />
      ) : (
        <Finance />
      )}
    </div>
  );
}

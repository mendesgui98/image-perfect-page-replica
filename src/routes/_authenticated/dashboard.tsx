import { createFileRoute, Navigate } from "@tanstack/react-router";
import { FinancialDashboard } from "@/components/works/dashboard";
import { dashboardSearch } from "@/lib/dashboard-search";
import { useMe } from "@/hooks/use-me";
import { NoAccess, PageHeader } from "@/components/page-header";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: dashboardSearch,
  head: () =>
    pageMeta("Dashboard financeiro", "Contratos, caixa, resultados e andamento das obras da JMG."),
  component: Page,
});
function Page() {
  const search = Route.useSearch();
  return <Navigate to="/financeiro" search={{ ...search, view: "analise" }} replace />;
}

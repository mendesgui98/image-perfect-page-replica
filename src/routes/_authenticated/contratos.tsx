import { createFileRoute } from "@tanstack/react-router";
import { ContractList } from "@/components/management/contracts";
import { useMe } from "@/hooks/use-me";
import { PageHeader, NoAccess } from "@/components/page-header";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/contratos")({
  head: () =>
    pageMeta("Contratos", "Contratos, assinaturas e documentos vinculados às obras da JMG."),
  component: Page,
});
function Page() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.canSeeCosts) return <NoAccess />;
  return (
    <div>
      <PageHeader title="Contratos" subtitle="Documentos e assinaturas das obras" />
      <ContractList />
    </div>
  );
}

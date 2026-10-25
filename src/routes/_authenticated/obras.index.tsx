import { WorkList } from "@/components/management/work-list";
import { NewWork } from "@/components/works/new-work";
import { dashboardSearch } from "@/components/works/dashboard";
import { useMe } from "@/hooks/use-me";
import { createFileRoute } from "@tanstack/react-router";
import { worksOptions } from "@/lib/work-data";
import { pageMeta } from "@/lib/page-meta";
import { PageHeader } from "@/components/page-header";
export const Route = createFileRoute("/_authenticated/obras/")({
  validateSearch: dashboardSearch,
  head: () => pageMeta("Obras", "Obras da JMG: contratação, execução, cronograma e entrega."),
  loader: ({ context }) => context.queryClient.ensureQueryData(worksOptions),
  component: Works,
});
function Works() {
  const { data: me } = useMe();
  return (
    <div>
      <PageHeader
        title="Obras"
        subtitle="Gestão e acompanhamento"
        actions={me?.canSeeCosts ? <NewWork /> : undefined}
      />
      <WorkList />
    </div>
  );
}

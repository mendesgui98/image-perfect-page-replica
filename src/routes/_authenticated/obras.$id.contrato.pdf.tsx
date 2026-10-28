import { DeletedRecordNotice } from "@/components/management/record-deletion";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { NoAccess } from "@/components/page-header";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/obras/$id/contrato/pdf")({
  head: () =>
    pageMeta(
      "Contrato para impressão",
      "Revisão e impressão do contrato JMG com escopo e condições aprovadas.",
    ),
  component: Pdf,
});
function Pdf() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const { data, error } = useQuery({
    queryKey: ["contract-print", id],
    enabled: !!me?.canSeeCosts,
    queryFn: async () => {
      const r = await supabase.from("contracts").select("*").eq("work_id", id).single();
      if (r.error) throw r.error;
      return r.data;
    },
  });
  if (data?.deleted_at)
    return <DeletedRecordNotice entity="contracts" id={data.id} name="Contrato" />;
  if (me && !me.canSeeCosts) return <NoAccess />;
  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link to="/obras/$id" params={{ id }}>
            ← Obra
          </Link>
        </Button>
        <span className="text-sm">
          {data?.status === "rascunho" ? "RASCUNHO" : data?.status.toUpperCase()}
        </span>
        <Button disabled={!data} onClick={() => window.print()}>
          Imprimir / salvar PDF
        </Button>
      </div>
      {error ? (
        <p className="text-destructive">{error.message}</p>
      ) : (
        <article className="contract-print mx-auto max-w-3xl bg-card p-8 text-card-foreground md:p-12">
          <img
            src="/jmg-logo-blue.png"
            className="mb-6 h-16 w-16 object-contain"
            alt="JMG Reformas"
          />
          <div className="whitespace-pre-wrap text-sm leading-7">
            {data?.body || "Carregando contrato…"}
          </div>
        </article>
      )}
    </div>
  );
}

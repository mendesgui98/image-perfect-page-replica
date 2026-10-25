import { RecordDeleteButton, DeletedRecordNotice } from "@/components/management/record-deletion";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Copy, FileDown, GitBranch, Lock } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/hooks/use-me";
import { NoAccess } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { budgetApi } from "@/lib/budget-api";
import { budgetKey, loadBudget } from "@/lib/budget-data";
import { computeBudget } from "@/lib/pricing";
import { STATUS_LABEL } from "@/lib/budget-status";
import { Approval } from "@/components/works/approval";
import { Attachment } from "@/components/works/fields";
import { ItemsEditor } from "@/components/budgets/items-editor";
import { DadosEditor } from "@/components/budgets/budget-details";
import { MaterialsSummary } from "@/components/budgets/materials-summary";
import { PricingPanel } from "@/components/budgets/pricing-panel";

export const Route = createFileRoute("/_authenticated/orcamentos/$id/")({
  head: () => pageMeta("Orçamento", "Serviços, condições e aprovação da proposta JMG."),
  component: Editor,
});

function Editor() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: budgetKey(id),
    queryFn: () => loadBudget(id),
    enabled: !!me?.canSeeCosts,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: budgetKey(id) });

  const result = useMemo(
    () => (data ? computeBudget(data.items, data.params, data.budget.general_discount) : null),
    [data],
  );

  const updBudget = useMutation({
    mutationFn: (p: Record<string, unknown>) => budgetApi.update(id, p),
    onSuccess: refresh,
    onError: (e) => toast.error((e as Error).message),
  });

  const copy = useMutation({
    mutationFn: (asRevision: boolean) => budgetApi.copy(id, asRevision),
    onSuccess: (nid, asRev) => {
      toast.success(asRev ? "Revisão criada." : "Proposta duplicada.");
      qc.invalidateQueries({ queryKey: ["budgets"] });
      navigate({ to: "/orcamentos/$id", params: { id: nid } });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (me && !me.canSeeCosts) return <NoAccess />;
  if (!data || !result) return <p className="text-muted-foreground">Carregando…</p>;
  const { budget } = data;
  if (budget.deleted_at)
    return <DeletedRecordNotice entity="budgets" id={id} name={`Orçamento nº ${budget.number}`} />;
  const locked = budget.status === "aprovado" || budget.status === "recusado";

  async function setStatus(status: string) {
    if (!result) return;
    await updBudget.mutateAsync({ status });
    // Falha no histórico não desfaz a mudança de situação, mas precisa aparecer.
    await budgetApi
      .logHistory({ budget_id: id, action: `status:${status}`, summary: { total: result.saleNet } })
      .catch((error: Error) => toast.error(`Histórico não registrado: ${error.message}`));
    toast.success(`Situação: ${STATUS_LABEL[status]}`);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/orcamentos" className="text-sm text-muted-foreground hover:underline">
            ← Orçamentos
          </Link>
          <h1 className="text-2xl font-extrabold md:text-3xl">
            Orçamento nº {budget.number}
            {budget.revision ? ` · Rev. ${budget.revision}` : ""}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
              {STATUS_LABEL[budget.status]}
            </span>
            <span>{budget.client_display}</span>
            {locked && (
              <span className="flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" /> Bloqueado — alterações por nova revisão
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => copy.mutate(false)}>
            <Copy className="h-4 w-4" /> Duplicar
          </Button>
          <Button variant="outline" onClick={() => copy.mutate(true)}>
            <GitBranch className="h-4 w-4" /> Nova revisão
          </Button>
          <Button asChild>
            <Link to="/orcamentos/$id/pdf" params={{ id }}>
              <FileDown className="h-4 w-4" /> Revisar PDF
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <RecordDeleteButton
          entity="budgets"
          id={id}
          name={`Orçamento nº ${budget.number}`}
          onDeleted={() => void navigate({ to: "/orcamentos" })}
        />
        {budget.status === "elaboracao" && (
          <Button size="sm" variant="secondary" onClick={() => setStatus("enviado")}>
            Marcar como enviado
          </Button>
        )}
        {budget.status === "enviado" && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setStatus("elaboracao")}>
              Voltar para elaboração
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setStatus("recusado")}>
              Marcar como recusado
            </Button>
          </>
        )}
        <Approval budgetId={id} status={budget.status} onChange={refresh} />
        <Attachment path={budget.approval_path} />
        {!budget.archived ? (
          <Button size="sm" variant="ghost" onClick={() => updBudget.mutate({ archived: true })}>
            Arquivar
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => updBudget.mutate({ archived: false })}>
            Desarquivar
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Tabs defaultValue="itens">
          <TabsList>
            <TabsTrigger value="itens">Serviços</TabsTrigger>
            <TabsTrigger value="dados">Dados e condições</TabsTrigger>
            <TabsTrigger value="materiais">Materiais</TabsTrigger>
          </TabsList>
          <TabsContent value="itens">
            <ItemsEditor
              budgetId={id}
              sections={data.sections}
              items={data.items}
              result={result}
              locked={locked}
              params={data.params}
              onChange={refresh}
            />
          </TabsContent>
          <TabsContent value="dados">
            <DadosEditor
              budget={budget}
              terms={data.terms}
              total={result.saleNet}
              locked={locked}
              onSave={(p) => updBudget.mutateAsync(p).then(() => toast.success("Salvo."))}
            />
          </TabsContent>
          <TabsContent value="materiais">
            <MaterialsSummary items={data.items} />
          </TabsContent>
        </Tabs>
        <PricingPanel
          budgetId={id}
          params={data.params}
          discount={budget.general_discount}
          items={data.items}
          result={result}
          locked={locked}
          onApplied={refresh}
        />
      </div>
    </div>
  );
}

/* ---------------- Itens ---------------- */

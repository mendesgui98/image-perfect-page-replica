import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { workOptions } from "@/lib/work-data";
import { pageMeta } from "@/lib/page-meta";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Field, selectClass } from "@/components/works/fields";
import { text } from "@/lib/form-values";
import { Schedule } from "@/components/works/schedule";
import { Records } from "@/components/works/records";
import { Contract } from "@/components/works/contract";
import { Purchases } from "@/components/works/purchases";
import { Finance } from "@/components/works/finance";
import { WorkSummaryPanel } from "@/components/works/summary";
import { StagePhotos } from "@/components/works/photos";
import { WorkSituation } from "@/components/works/situation";
import { WorkResult } from "@/components/works/result";
export const Route = createFileRoute("/_authenticated/obras/$id/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: string; record?: string; entry?: string } => ({
    tab: typeof s["tab"] === "string" ? s["tab"] : "resumo",
    record: typeof s["record"] === "string" ? s["record"] : "",
    entry: typeof s["entry"] === "string" ? s["entry"] : "",
  }),
  head: () =>
    pageMeta(
      "Gestão da obra",
      "Cronograma, diário, contrato, compras e acompanhamento da obra JMG.",
    ),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(workOptions(params.id)),
  component: Work,
});
function Work() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(workOptions(id));
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const w = data.work;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["schedules"] });
    qc.invalidateQueries({ queryKey: ["schedule"] });
    qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
    qc.invalidateQueries({ queryKey: ["work", id] });
    qc.invalidateQueries({ queryKey: ["works"] });
    qc.invalidateQueries({ queryKey: ["all-work-stages"] });
    qc.invalidateQueries({ queryKey: ["schedule-versions", id] });
  };
  async function save(d: FormData) {
    setBusy(true);
    try {
      const r = await supabase
        .from("work_registry")
        .update({
          name: text(d, "name"),
          responsible: text(d, "responsible"),
          address: text(d, "address"),
          planned_start: text(d, "start") || null,
          planned_end: text(d, "end") || null,
          actual_start: text(d, "actual_start") || null,
          actual_end: text(d, "actual_end") || null,
          status: text(d, "status"),
        })
        .eq("id", id);
      if (r.error) throw r.error;
      setOpen(false);
      refresh();
      toast.success("Obra atualizada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <Link to="/obras" className="text-sm text-muted-foreground">
        ← Obras
      </Link>
      <PageHeader
        title={w.name}
        subtitle={`${w.origin === "direto" ? "CADASTRO DIRETO" : "ORÇAMENTO"} · ${w.status.toUpperCase()} · ${w.address || "Endereço não informado"}`}
        actions={
          <>
            {w.linked_budget_id && me?.canSeeCosts && (
              <Button variant="outline" asChild>
                <Link to="/orcamentos/$id" params={{ id: w.linked_budget_id }}>
                  Orçamento original
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/obras/$id/relatorio/pdf" params={{ id }}>
                <FileDown className="h-4 w-4" />
                Relatório
              </Link>
            </Button>
            {me?.canSeeCosts && (
              <Button variant="outline" onClick={() => setOpen(true)}>
                <Settings className="h-4 w-4" />
                Dados da obra
              </Button>
            )}
          </>
        }
      />
      <Tabs
        value={search.tab || "resumo"}
        onValueChange={(tab) =>
          navigate({ to: "/obras/$id", params: { id }, search: (old) => ({ ...old, tab }) })
        }
      >
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="resumo">Visão Geral</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
          {me?.canSeeCosts && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          {me?.canSeeCosts && (
            <>
              <TabsTrigger value="compras">Compras</TabsTrigger>
              <TabsTrigger value="resultado">Aditivos</TabsTrigger>
            </>
          )}
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="documento">Documentos</TabsTrigger>
          {me?.canSeeCosts && <TabsTrigger value="contrato">Contrato</TabsTrigger>}
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="entrega">Entrega</TabsTrigger>
          <TabsTrigger value="assistencia">Assistência</TabsTrigger>
          <TabsTrigger value="decisao">Decisões</TabsTrigger>
        </TabsList>
        <TabsContent value="resumo">
          {me?.canSeeCosts ? (
            <WorkSummaryPanel workId={id} />
          ) : (
            <WorkSituation work={w} stages={data.stages} records={data.records} />
          )}
        </TabsContent>
        <TabsContent value="etapas">
          <Schedule workId={id} stages={data.stages} records={data.records} onChange={refresh} />
        </TabsContent>
        <TabsContent value="fotos">
          <StagePhotos records={data.records} stages={data.stages} />
        </TabsContent>
        <TabsContent value="relatorios">
          <h2 className="mb-4 font-bold">Relatórios de avanço</h2>
          <Button asChild variant="outline">
            <Link to="/obras/$id/relatorio/pdf" params={{ id }}>
              <FileDown className="h-4 w-4" />
              Relatório de evolução
            </Link>
          </Button>
        </TabsContent>
        <TabsContent value="cronograma">
          <Schedule
            workId={id}
            stages={data.stages}
            records={data.records}
            onChange={refresh}
            mode="cronograma"
            work={w}
          />
        </TabsContent>
        {["diario", "entrega", "assistencia", "decisao", "documento"].map((kind) => (
          <TabsContent key={kind} value={kind}>
            <Records workId={id} kind={kind} records={data.records} onChange={refresh} />
          </TabsContent>
        ))}
        {me?.canSeeCosts && (
          <>
            <TabsContent value="contrato">
              <Contract
                workId={id}
                budgetId={w.linked_budget_id}
                start={w.planned_start}
                end={w.planned_end}
                address={w.address}
              />
            </TabsContent>
            <TabsContent value="compras">
              <Purchases workId={id} budgetId={w.linked_budget_id} />
            </TabsContent>
            <TabsContent value="financeiro">
              <Finance workId={id} />
            </TabsContent>
            <TabsContent value="resultado">
              <WorkResult workId={id} budgetId={w.linked_budget_id} />
            </TabsContent>
          </>
        )}
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados da obra</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save(new FormData(e.currentTarget));
            }}
          >
            <Field name="name" label="Nome da obra" required value={w.name} capitalize />
            <Field name="responsible" label="Responsável" value={w.responsible} capitalize />
            <div className="sm:col-span-2">
              <Field name="address" label="Endereço" value={w.address} capitalize />
            </div>
            <Field name="start" label="Início previsto" type="date" value={w.planned_start} />
            <Field name="end" label="Término previsto" type="date" value={w.planned_end} />
            <Field name="actual_start" label="Início real" type="date" value={w.actual_start} />
            <Field name="actual_end" label="Término real" type="date" value={w.actual_end} />
            <label className="text-sm">
              Situação
              <select name="status" defaultValue={w.status} className={selectClass}>
                <option value="contratacao">Em contratação</option>
                <option value="execucao">Em execução</option>
                <option value="pausada">Pausada</option>
                <option value="concluida">Concluída</option>
              </select>
            </label>
            <Button type="submit" disabled={busy}>
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

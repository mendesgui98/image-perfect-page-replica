import { RecordDeleteButton, DeletedRecordNotice } from "@/components/management/record-deletion";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, HardHat, Link2, Pencil, Settings } from "lucide-react";
import { scheduleOptions } from "@/lib/schedule-data";
import { worksOptions, workOptions } from "@/lib/work-data";
import { pageMeta } from "@/lib/page-meta";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Memo, selectClass } from "@/components/works/fields";
import { text } from "@/lib/form-values";
import { NewSchedule } from "@/components/schedules/new-schedule";
import { StandaloneEditor } from "@/components/schedules/standalone-editor";
import { ScheduleDashboard } from "@/components/schedules/schedule-dashboard";
import { editableStages } from "@/lib/schedule-data";
export const Route = createFileRoute("/_authenticated/cronogramas/$id")({
  head: () =>
    pageMeta(
      "Planejamento do cronograma",
      "Etapas, Gantt, versões e documento do planejamento JMG.",
    ),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(scheduleOptions(params.id)),
  component: ScheduleDetail,
});
function ScheduleDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(scheduleOptions(id));
  const { data: me } = useMe();
  const qc = useQueryClient();
  const h = data.header;
  const [link, setLink] = useState(false),
    [edit, setEdit] = useState(false),
    [busy, setBusy] = useState(false),
    [linkError, setLinkError] = useState("");
  const { data: works = [] } = useQuery(worksOptions);
  const refresh = () => {
    for (const key of [
      ["schedule", id],
      ["schedules"],
      ["work"],
      ["works"],
      ["schedule-versions"],
      ["financial-dashboard"],
      ["all-work-stages"],
    ])
      qc.invalidateQueries({ queryKey: key });
  };
  async function update(d: FormData) {
    setBusy(true);
    const r = await supabase
      .from("schedules")
      .update({
        name: text(d, "name"),
        client_name: text(d, "client_name"),
        address: text(d, "address"),
        responsible: text(d, "responsible"),
        description: text(d, "description"),
        planned_start: text(d, "planned_start") || null,
        planned_end: text(d, "planned_end") || null,
      })
      .eq("id", id);
    setBusy(false);
    if (r.error) toast.error(r.error.message);
    else {
      setEdit(false);
      refresh();
    }
  }
  if (h.deleted_at) return <DeletedRecordNotice entity="schedules" id={id} name={h.name} />;
  // Cronograma vinculado: painel da obra (datas do orçamento aprovado, pagamentos e materiais do
  // cliente); as etapas são editadas na aba Cronograma da obra.
  if (h.work_id)
    return (
      <div className="space-y-4">
        <Link
          to="/cronogramas"
          className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Cronogramas
        </Link>
        <ScheduleDashboard workId={h.work_id} />
      </div>
    );
  return (
    <div className="space-y-5">
      <Link
        to="/cronogramas"
        className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Cronogramas
      </Link>
      <PageHeader
        title={h.name}
        subtitle={`${h.is_template ? "MODELO DE CRONOGRAMA" : h.work_id ? "VINCULADO À OBRA" : "CRONOGRAMA AVULSO"} · ${h.client_name || "Cliente não informado"} · ${h.address || "Local não informado"}`}
        actions={
          <>
            <RecordDeleteButton entity="schedules" id={id} name={h.name} />
            <Button variant="outline" asChild>
              {/* Vinculado: o PDF da obra traz também pagamentos e materiais do cliente. */}
              {h.work_id ? (
                <Link to="/obras/$id/cronograma/pdf" params={{ id: h.work_id }}>
                  <FileDown className="h-4 w-4" />
                  Gerar PDF
                </Link>
              ) : (
                <Link to="/cronogramas/$id/pdf" params={{ id }}>
                  <FileDown className="h-4 w-4" />
                  Gerar PDF
                </Link>
              )}
            </Button>
            {me?.canSeeCosts && <NewSchedule copyId={id} />}
          </>
        }
      />
      {h.description && (
        <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
          {h.description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {h.work_id && (
          <Button asChild variant="outline">
            <Link to="/obras/$id" params={{ id: h.work_id }} search={{ tab: "cronograma" }}>
              <HardHat className="h-4 w-4" />
              Abrir na obra
            </Link>
          </Button>
        )}
        {h.budget_id && me?.canSeeCosts && (
          <Button asChild variant="outline">
            <Link to="/orcamentos/$id" params={{ id: h.budget_id }}>
              <FileSpreadsheet className="h-4 w-4" />
              Orçamento de origem
            </Link>
          </Button>
        )}
        {me?.canSeeCosts && (
          <>
            {!h.work_id && (
              <>
                <Button variant="outline" onClick={() => setEdit(true)}>
                  <Settings className="h-4 w-4" />
                  Dados do cronograma
                </Button>
                {!h.is_template && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLinkError("");
                      setLink(true);
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                    Vincular a uma obra
                  </Button>
                )}
              </>
            )}
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-muted px-3 text-sm">
              <input
                type="checkbox"
                checked={h.is_template}
                disabled={!!h.work_id || busy}
                onChange={async (e) => {
                  setBusy(true);
                  const r = await supabase
                    .from("schedules")
                    .update({ is_template: e.target.checked })
                    .eq("id", id);
                  setBusy(false);
                  if (r.error) toast.error(r.error.message);
                  else refresh();
                }}
              />
              Modelo de cronograma
            </label>
          </>
        )}
      </div>
      <StandaloneEditor
        header={h}
        stages={editableStages(h.standalone_stages)}
        versions={data.versions}
        onChange={refresh}
      />
      <Dialog open={link} onOpenChange={setLink}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a uma obra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            As etapas e o histórico serão mantidos. Obras que já possuem planejamento não serão
            substituídas.
          </p>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const r = await supabase.rpc("link_schedule_work", {
                _schedule_id: id,
                _work_id: text(new FormData(e.currentTarget), "work"),
              });
              setBusy(false);
              if (r.error) setLinkError(r.error.message);
              else {
                setLink(false);
                refresh();
                toast.success("Cronograma vinculado, com histórico preservado.");
              }
            }}
          >
            <label className="text-sm">
              Obra
              <select className={selectClass} name="work" required>
                <option value="">Selecionar obra</option>
                {works.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            {linkError && (
              <p role="alert" className="text-sm text-destructive">
                {linkError}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              Confirmar vínculo
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados do cronograma</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void update(new FormData(e.currentTarget));
            }}
          >
            <Field label="Nome da obra/projeto" name="name" required value={h.name} capitalize />
            <Field label="Nome do cliente" name="client_name" value={h.client_name} capitalize />
            <Field label="Local da obra" name="address" value={h.address} capitalize />
            <Field label="Responsável" name="responsible" value={h.responsible} capitalize />
            <Field
              label="Data prevista de início"
              name="planned_start"
              type="date"
              value={h.planned_start}
            />
            <Field
              label="Data prevista de término"
              name="planned_end"
              type="date"
              value={h.planned_end}
            />
            <Memo label="Descrição" name="description" value={h.description} />
            <Button type="submit" disabled={busy}>
              Salvar dados
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

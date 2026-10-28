import { RecordDeleteButton, RecordTrash } from "@/components/management/record-deletion";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileSpreadsheet, HardHat, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { NoAccess, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadBudget } from "@/lib/budget-data";
import { computeBudget } from "@/lib/pricing";
import { DEFAULT_NOTES, DEFAULT_TERMS } from "@/lib/proposal";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/budget-status";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { BUDGET_STATUS_VARIANT } from "@/lib/status-badges";
import { EmptyState, ListSkeleton } from "@/components/feedback";
import { IconBubble, Money } from "@/components/kpi";
import { selectClass } from "@/components/works/fields";
import { panelClass } from "@/lib/surface";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orcamentos/")({
  head: () => pageMeta("Orçamentos", "Propostas e revisões comerciais da JMG."),
  component: Lista,
});

function Lista() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [architectId, setArchitectId] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [archived, setArchived] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["budgets", archived],
    enabled: !!me?.canSeeCosts,
    queryFn: async () => {
      const r = await supabase
        .from("budgets")
        .select("*")
        .is("deleted_at", null)
        .eq("archived", archived)
        .order("number", { ascending: false })
        .order("revision", { ascending: false });
      if (r.error) throw r.error;
      const wr = await supabase.from("work_registry").select("id,linked_budget_id");
      if (wr.error) throw wr.error;
      return Promise.all(
        r.data.map(async (b) => {
          const full = await loadBudget(b.id);
          return {
            ...b,
            value: computeBudget(full.items, full.params, b.general_discount).saleNet,
            work: wr.data.find((w) => w.linked_budget_id === b.id),
          };
        }),
      );
    },
  });
  const { data: people = [] } = useQuery({
    queryKey: ["people", "all"],
    queryFn: async () =>
      (
        await supabase
          .from("people")
          .select("*")
          .in("kind", ["cliente", "arquiteto"])
          .is("deleted_at", null)
          .eq("active", true)
          .order("name")
      ).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const c = people.find((p) => p.id === clientId);
      if (!c) throw new Error("Selecione o cliente.");
      const [{ data: pricing }, { data: company }] = await Promise.all([
        supabase.from("pricing_settings").select("*").maybeSingle(),
        supabase.from("company_settings").select("texto_fechamento").maybeSingle(),
      ]);
      // Cópia dos padrões de Configurações > Precificação (modelo do custo direto).
      const params = pricing
        ? {
            model: "custo_direto",
            structure_rate: pricing.structure_rate,
            architect_commission: pricing.architect_commission,
            apply_rt: !!architectId,
            tax_rate: pricing.tax_rate,
            desired_margin: pricing.desired_margin,
            min_margin: pricing.min_margin,
            negotiated_price: null,
          }
        : { model: "custo_direto" };
      const { data, error } = await supabase
        .from("budgets")
        .insert({
          client_id: c.id,
          architect_id: architectId || null,
          client_display: c.name,
          endereco: c.endereco,
          bairro: c.bairro,
          cidade: c.cidade,
          uf: c.uf,
          cep: c.cep,
          params,
          payment_terms: DEFAULT_TERMS,
          notes: DEFAULT_NOTES,
          closing_text: company?.texto_fechamento ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase
        .from("budget_history")
        .insert({ budget_id: data.id, action: "criado", summary: { params } });
      return data.id;
    },
    onSuccess: (id) => navigate({ to: "/orcamentos/$id", params: { id } }),
    onError: (e) => toast.error((e as Error).message),
  });

  if (me && !me.canSeeCosts) return <NoAccess />;

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Propostas comerciais com precificação interna."
        actions={
          <>
            <RecordTrash entity="budgets" />
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Novo orçamento
            </Button>
          </>
        }
      />
      <div className={cn(panelClass, "mb-4 flex flex-wrap items-center gap-3 p-4")}>
        <Input
          className="min-w-0 flex-1 sm:max-w-sm"
          aria-label="Buscar orçamento"
          placeholder="Buscar número, cliente ou projeto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Status do orçamento"
          className={cn(selectClass, "w-full sm:w-auto")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
          <option value="convertido">Convertido em obra</option>
        </select>
        <label className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
          <Switch checked={archived} onCheckedChange={setArchived} /> Ver arquivados
        </label>
      </div>
      {data.length === 0 ? (
        isLoading && me?.canSeeCosts ? (
          <ListSkeleton />
        ) : (
          <EmptyState icon={FileSpreadsheet} title="Nenhum orçamento." />
        )
      ) : (
        <div className={cn(panelClass, "divide-y divide-border/60 overflow-hidden")}>
          {data
            .filter(
              (b) =>
                (!status || (status === "convertido" ? !!b.work : b.status === status)) &&
                (String(b.number) + b.title + b.client_display)
                  .toLowerCase()
                  .includes(q.toLowerCase()),
            )
            .map((b) => (
              <article
                key={b.id}
                className="relative flex cursor-pointer gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
              >
                <IconBubble icon={FileSpreadsheet} tone={b.work ? "brand" : "neutral"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/orcamentos/$id"
                        params={{ id: b.id }}
                        aria-label={`Abrir orçamento nº ${b.number}`}
                        // O card inteiro abre o orçamento (o link cobre o card).
                        className="font-semibold text-primary after:absolute after:inset-0 after:content-[''] hover:underline"
                      >
                        {b.number}
                        {b.revision ? ` · Rev. ${b.revision}` : ""}
                      </Link>
                      <h3 className="truncate font-medium leading-snug">{b.client_display}</h3>
                    </div>
                    <Money value={b.value} className="shrink-0 text-base font-semibold" />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.title ? `${b.title} · ` : ""}Emissão {fmtDate(b.issue_date)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {b.work ? (
                      <Link to="/obras/$id" params={{ id: b.work.id }} className="relative z-10">
                        <Badge variant="positive" className="hover:opacity-80">
                          <HardHat className="h-3 w-3" /> Convertido em obra
                        </Badge>
                      </Link>
                    ) : (
                      <Badge variant={BUDGET_STATUS_VARIANT[b.status] ?? "neutral"}>
                        {STATUS_LABEL[b.status]}
                      </Badge>
                    )}
                    <span className="relative z-10 ml-auto">
                      <RecordDeleteButton
                        entity="budgets"
                        id={b.id}
                        name={`Orçamento nº ${b.number}`}
                      />
                    </span>
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <SubmitForm onSubmit={() => create.mutate()} pending={create.isPending}>
            <DialogHeader>
              <DialogTitle>Novo orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Cliente</Label>
                <select
                  className={selectClass}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {people
                    .filter((p) => p.kind === "cliente")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Não encontrou?{" "}
                  <Link to="/cadastros" className="text-primary underline">
                    Cadastre o cliente
                  </Link>
                  .
                </p>
              </div>
              <div className="space-y-1">
                <Label>Arquiteto(a) (opcional)</Label>
                <select
                  className={selectClass}
                  value={architectId}
                  onChange={(e) => setArchitectId(e.target.value)}
                >
                  <option value="">—</option>
                  {people
                    .filter((p) => p.kind === "arquiteto")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Os percentuais de precificação atuais são copiados para este orçamento e podem ser
                ajustados nele.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                Criar rascunho
              </Button>
            </DialogFooter>
          </SubmitForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { RecordDeleteButton, RecordTrash } from "@/components/management/record-deletion";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
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
import { fmtBRL } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/budget-status";

export const Route = createFileRoute("/_authenticated/orcamentos/")({
  head: () => pageMeta("Orçamentos", "Propostas e revisões comerciais da JMG."),
  component: Lista,
});

const DEFAULT_TERMS = [
  { label: "ÍNICIO (ASSINATURA DO CONTRATO)", pct: 30 },
  { label: "AO INICIAR ETAPA FORRO", pct: 12.5 },
  { label: "AO INICIAR ETAPA REVESTIMENTOS", pct: 12.5 },
  { label: "AO INICIAR ETAPA PINTURA", pct: 12.5 },
  { label: "AO INICIAR ETAPA INSTALAÇÕES", pct: 12.5 },
  { label: "ENTREGA E FINALIZAÇÃO", pct: 20 },
];

function Lista() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [architectId, setArchitectId] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [archived, setArchived] = useState(false);

  const { data = [] } = useQuery({
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
      const params = pricing
        ? {
            labor_markup: pricing.labor_markup,
            materials_markup: pricing.materials_markup,
            negotiation_reserve: pricing.negotiation_reserve,
            desired_margin: pricing.desired_margin,
            min_margin: pricing.min_margin,
            architect_commission: pricing.architect_commission,
            reinvestment_share: pricing.reinvestment_share,
            taxes: pricing.taxes,
          }
        : {};
      const validity = new Date();
      validity.setDate(validity.getDate() + 15);
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
          closing_text: company?.texto_fechamento ?? null,
          validity_date: validity.toISOString().slice(0, 10),
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
      <label className="mb-4 flex items-center gap-2 text-sm">
        <Switch checked={archived} onCheckedChange={setArchived} /> Ver arquivados
      </label>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="sm:max-w-sm"
          aria-label="Buscar orçamento"
          placeholder="Buscar número, cliente ou projeto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Status do orçamento"
          className="h-10 rounded-md border bg-background px-3 text-sm"
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
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="p-3">Nº</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Obra / Projeto</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Emissão</th>
              <th className="p-3">Situação</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter(
                (b) =>
                  (!status || (status === "convertido" ? !!b.work : b.status === status)) &&
                  (String(b.number) + b.title + b.client_display)
                    .toLowerCase()
                    .includes(q.toLowerCase()),
              )
              .map((b) => (
                <tr key={b.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 font-medium">
                    <Link
                      to="/orcamentos/$id"
                      params={{ id: b.id }}
                      className="text-primary hover:underline"
                    >
                      {b.number}
                      {b.revision ? ` · Rev. ${b.revision}` : ""}
                    </Link>
                  </td>
                  <td className="p-3">{b.client_display}</td>
                  <td className="p-3">{b.title}</td>
                  <td className="whitespace-nowrap p-3 num">{fmtBRL(b.value)}</td>
                  <td className="p-3">{fmtDate(b.issue_date)}</td>
                  <td className="p-3">
                    {b.work ? (
                      <Link to="/obras/$id" params={{ id: b.work.id }} className="text-primary">
                        Convertido em obra
                      </Link>
                    ) : (
                      STATUS_LABEL[b.status]
                    )}
                  </td>
                  <td className="p-3">
                    <RecordDeleteButton
                      entity="budgets"
                      id={b.id}
                      name={`Orçamento nº ${b.number}`}
                    />
                  </td>
                </tr>
              ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Nenhum orçamento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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

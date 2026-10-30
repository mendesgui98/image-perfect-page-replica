import { pageMeta } from "@/lib/page-meta";
import { formatCep, formatCnpj, formatPhone } from "@/lib/documents";
import { capitalizeWordsProps } from "@/lib/text-case";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMe, type Role } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { costBreakdown } from "@/lib/pricing";
import { fmtBRL } from "@/lib/format";
import { apiConfigured } from "@/lib/api-client";
import { UsersAdmin } from "@/components/admin/users-admin";
import { MfaSettings } from "@/components/admin/mfa";
import { ContractClausesSettings } from "@/components/settings/contract-clauses";
import { IconBubble } from "@/components/kpi";
import { selectClass } from "@/components/works/fields";
import { cn } from "@/lib/utils";

type Company = Database["public"]["Tables"]["company_settings"]["Row"];
type Pricing = Database["public"]["Tables"]["pricing_settings"]["Row"];

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => pageMeta("Configurações", "Dados da empresa, precificação e acessos da JMG."),
  component: Config,
});

function Config() {
  const { data: me } = useMe();
  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle={
          me?.isAdmin
            ? "Dados da JMG, regras de precificação e perfis de acesso."
            : "Somente o administrador pode alterar."
        }
      />
      <Tabs
        defaultValue={
          typeof window !== "undefined" && window.location.hash
            ? window.location.hash.slice(1)
            : "empresa"
        }
      >
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          {me?.canSeeCosts && <TabsTrigger value="precos">Precificação</TabsTrigger>}
          {me?.canSeeCosts && <TabsTrigger value="contrato">Contrato</TabsTrigger>}
          {me?.isAdmin && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa">
          <Empresa ro={!me?.isAdmin} />
        </TabsContent>
        <TabsContent value="precos">
          <Precos ro={!me?.isAdmin} />
        </TabsContent>
        <TabsContent value="contrato">
          <ContractClausesSettings ro={!me?.isAdmin} />
        </TabsContent>
        <TabsContent value="seguranca">
          <MfaSettings required={!!me?.isAdmin} />
        </TabsContent>
        <TabsContent value="usuarios">{apiConfigured ? <UsersAdmin /> : <Usuarios />}</TabsContent>
      </Tabs>
    </div>
  );
}

// Pontuação aplicada enquanto digita.
const COMPANY_MASKS: Partial<Record<string, (v: string) => string>> = {
  cnpj: formatCnpj,
  telefone: formatPhone,
  cep: formatCep,
};
// Primeira letra de cada palavra maiúscula enquanto digita.
const COMPANY_CAPITALIZED = new Set([
  "razao_social",
  "nome_fantasia",
  "responsavel",
  "endereco",
  "bairro",
  "cidade",
]);

const COMPANY_FIELDS: [keyof Company, string][] = [
  ["razao_social", "Razão social"],
  ["nome_fantasia", "Nome fantasia"],
  ["cnpj", "CNPJ"],
  ["responsavel", "Responsável"],
  ["endereco", "Endereço"],
  ["bairro", "Bairro"],
  ["cidade", "Cidade"],
  ["uf", "UF"],
  ["cep", "CEP"],
  ["telefone", "Telefone"],
  ["email", "E-mail"],
  ["instagram", "Instagram"],
  ["banco", "Banco"],
  ["agencia", "Agência"],
  ["conta", "Conta corrente"],
  ["pix", "Chave PIX"],
];

function Empresa({ ro }: { ro: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["company"],
    queryFn: async () => (await supabase.from("company_settings").select("*").maybeSingle()).data,
  });
  const [f, setF] = useState<Partial<Company>>({});
  useEffect(() => {
    if (data) setF(data);
  }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("company_settings").update(f).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados da empresa salvos.");
      qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card className="mt-4">
      <SubmitForm onSubmit={() => save.mutate()} pending={save.isPending} className="">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          {COMPANY_FIELDS.map(([k, l]) => (
            <div
              key={k}
              className={
                k === "endereco" || k === "razao_social" ? "space-y-1 sm:col-span-2" : "space-y-1"
              }
            >
              <Label>{l}</Label>
              <Input
                disabled={ro}
                value={(f[k] as string) ?? ""}
                inputMode={
                  k === "cnpj" || k === "cep" ? "numeric" : k === "telefone" ? "tel" : undefined
                }
                {...(COMPANY_CAPITALIZED.has(k) ? capitalizeWordsProps : {})}
                onChange={(e) =>
                  setF({ ...f, [k]: COMPANY_MASKS[k]?.(e.target.value) ?? e.target.value })
                }
              />
            </div>
          ))}
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label>Quem somos (página 2 do orçamento)</Label>
            <Textarea
              rows={6}
              disabled={ro}
              value={f.sobre ?? ""}
              onChange={(e) => setF({ ...f, sobre: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label>Texto de fechamento padrão do orçamento</Label>
            <Textarea
              rows={4}
              disabled={ro}
              value={f.texto_fechamento ?? ""}
              onChange={(e) => setF({ ...f, texto_fechamento: e.target.value })}
            />
          </div>
          {!ro && (
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={save.isPending}>
                Salvar dados da empresa
              </Button>
            </div>
          )}
        </CardContent>
      </SubmitForm>
    </Card>
  );
}

/** Padrões do modelo de preço pelo custo direto (cada orçamento novo guarda uma cópia). */
const PCT_FIELDS: [keyof Pricing, string, string][] = [
  [
    "structure_rate",
    "Custo estrutural JMG (%)",
    "Parte do preço que cobre a estrutura da empresa.",
  ],
  [
    "architect_commission",
    "RT / comissão do arquiteto (%)",
    "Pode ser desligada em cada orçamento.",
  ],
  ["tax_rate", "Impostos (%)", "Parte do preço que vai para impostos."],
  ["desired_margin", "Margem-alvo de lucro (%)", "Margem usada para calcular o preço."],
  ["min_margin", "Margem mínima (%)", "Abaixo dela o orçamento mostra alerta e pede confirmação."],
];

function Precos({ ro }: { ro: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => (await supabase.from("pricing_settings").select("*").maybeSingle()).data,
  });
  const [f, setF] = useState<Partial<Pricing>>({});
  useEffect(() => {
    if (data) setF(data);
  }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { configured: true };
      for (const [k] of PCT_FIELDS) payload[k] = Number(f[k]) || 0;
      const { error } = await supabase
        .from("pricing_settings")
        .update(payload as never)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Padrões salvos. Valem para os próximos orçamentos.");
      qc.invalidateQueries({ queryKey: ["pricing"] });
      qc.invalidateQueries({ queryKey: ["painel"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const rates = {
    structure: Number(f.structure_rate) || 0,
    rt: Number(f.architect_commission) || 0,
    taxes: Number(f.tax_rate) || 0,
    margin: Number(f.desired_margin) || 0,
  };
  // Exemplo: R$ 10.000 de mão de obra e R$ 5.000 de materiais (materiais levam só o imposto).
  const example = costBreakdown(15000, rates, 5000);
  return (
    <SubmitForm
      onSubmit={() => save.mutate()}
      pending={save.isPending}
      className="mt-4 grid gap-6 lg:grid-cols-2"
    >
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Formação de preço · padrões da JMG</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mão de obra = custo da mão de obra ÷ [1 − (estrutura + RT + impostos + margem)];
            materiais = custo ÷ (1 − impostos). Preço = mão de obra + materiais. Mudar aqui não
            altera orçamentos já criados.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {PCT_FIELDS.map(([k, l, h]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`pricing-${k}`}>{l}</Label>
              <Input
                id={`pricing-${k}`}
                type="number"
                step="any"
                min={0}
                disabled={ro}
                value={(f[k] as number) ?? 0}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{h}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Exemplo com estes padrões</CardTitle>
          <p className="text-sm text-muted-foreground">
            Uma obra com R$ 10.000,00 de mão de obra e R$ 5.000,00 de materiais.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0 text-sm sm:p-6 sm:pt-0">
          {example === null ? (
            <p className="flex items-center gap-2 rounded-xl bg-negative-soft px-3 py-2 text-negative">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              Os percentuais somam 100% ou mais; não existe preço possível.
            </p>
          ) : (
            (() => {
              const b = example;
              return (
                <dl className="divide-y divide-border/60">
                  {(
                    [
                      ["Custo direto", b.directCost],
                      ["Materiais com imposto", b.materialsPrice],
                      ["Mão de obra", b.laborPrice],
                      [`Estrutura JMG · ${rates.structure}% da mão de obra`, b.structure],
                      [`RT · ${rates.rt}% da mão de obra`, b.rt],
                      [`Impostos · ${rates.taxes}% do preço`, b.taxes],
                      [`Lucro · ${rates.margin}% da mão de obra`, b.profit],
                    ] as const
                  ).map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-3 py-2">
                      <dt className="text-muted-foreground">{l}</dt>
                      <dd className="font-medium num">{fmtBRL(v)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 py-2 text-base font-bold">
                    <dt>Preço de venda</dt>
                    <dd className="num">{fmtBRL(b.price)}</dd>
                  </div>
                </dl>
              );
            })()
          )}
        </CardContent>
      </Card>
      {!ro && (
        <div className="lg:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            Salvar padrões de precificação
          </Button>
        </div>
      )}
    </SubmitForm>
  );
}

/** Fluxo antigo (sem API própria configurada): papéis gravados direto pelo Supabase. */
function Usuarios() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role),
      }));
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ uid, role, on }: { uid: string; role: Role; on: boolean }) => {
      if (!on && role === "admin" && uid === me?.id)
        throw new Error("Você não pode remover seu próprio acesso de administrador.");
      const { error } = on
        ? await supabase.from("user_roles").insert({ user_id: uid, role })
        : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card className="mt-4 overflow-hidden">
      <CardContent className="divide-y divide-border/60 p-0">
        {data.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
            <IconBubble icon={User} tone="neutral" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{u.full_name || u.email}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
            <div className="flex w-full flex-wrap gap-2 pl-12 sm:w-auto sm:pl-0">
              {(["admin", "financeiro", "equipe"] as Role[]).map((r) => (
                <label
                  key={r}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 text-sm capitalize"
                >
                  <input
                    type="checkbox"
                    checked={u.roles.includes(r)}
                    onChange={(e) => toggle.mutate({ uid: u.id, role: r, on: e.target.checked })}
                  />
                  {r === "equipe" ? "equipe de obra" : r}
                </label>
              ))}
            </div>
          </div>
        ))}
        <p className="px-4 py-4 text-xs text-muted-foreground sm:px-5">
          Administrador e financeiro veem custos, margens e orçamentos. A equipe de obra não tem
          acesso a esses dados — o bloqueio é aplicado no banco de dados.
        </p>
      </CardContent>
    </Card>
  );
}

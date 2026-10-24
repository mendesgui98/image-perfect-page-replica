import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMe, type Role } from "@/hooks/use-me";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tax } from "@/lib/pricing";

type Company = Database["public"]["Tables"]["company_settings"]["Row"];
type Pricing = Database["public"]["Tables"]["pricing_settings"]["Row"];

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — JMG Reformas" }] }),
  component: Config,
});

function Config() {
  const { data: me } = useMe();
  return (
    <div>
      <PageHeader title="Configurações" subtitle={me?.isAdmin ? "Dados da JMG, regras de precificação e perfis de acesso." : "Somente o administrador pode alterar."} />
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          {me?.canSeeCosts && <TabsTrigger value="precos">Precificação</TabsTrigger>}
          {me?.isAdmin && <TabsTrigger value="usuarios">Usuários</TabsTrigger>}
        </TabsList>
        <TabsContent value="empresa">
          <Empresa ro={!me?.isAdmin} />
        </TabsContent>
        <TabsContent value="precos">
          <Precos ro={!me?.isAdmin} />
        </TabsContent>
        <TabsContent value="usuarios">
          <Usuarios />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const COMPANY_FIELDS: [keyof Company, string][] = [
  ["razao_social", "Razão social"], ["nome_fantasia", "Nome fantasia"], ["cnpj", "CNPJ"], ["responsavel", "Responsável"],
  ["endereco", "Endereço"], ["bairro", "Bairro"], ["cidade", "Cidade"], ["uf", "UF"], ["cep", "CEP"],
  ["telefone", "Telefone"], ["email", "E-mail"], ["instagram", "Instagram"],
  ["banco", "Banco"], ["agencia", "Agência"], ["conta", "Conta corrente"], ["pix", "Chave PIX"],
];

function Empresa({ ro }: { ro: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["company"], queryFn: async () => (await supabase.from("company_settings").select("*").maybeSingle()).data });
  const [f, setF] = useState<Partial<Company>>({});
  useEffect(() => data && setF(data), [data]);
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
    <Card className="mt-4 shadow-card">
      <CardContent className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {COMPANY_FIELDS.map(([k, l]) => (
          <div key={k} className={k === "endereco" || k === "razao_social" ? "space-y-1 sm:col-span-2" : "space-y-1"}>
            <Label>{l}</Label>
            <Input disabled={ro} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <Label>Quem somos (página 2 do orçamento)</Label>
          <Textarea rows={6} disabled={ro} value={f.sobre ?? ""} onChange={(e) => setF({ ...f, sobre: e.target.value })} />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <Label>Texto de fechamento padrão do orçamento</Label>
          <Textarea rows={4} disabled={ro} value={f.texto_fechamento ?? ""} onChange={(e) => setF({ ...f, texto_fechamento: e.target.value })} />
        </div>
        {!ro && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={() => save.mutate()}>Salvar dados da empresa</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PCT_FIELDS: [keyof Pricing, string, string][] = [
  ["labor_markup", "Acréscimo sobre custo — mão de obra (%)", "Base: custo do terceiro"],
  ["materials_markup", "Acréscimo sobre custo — materiais (%)", "Base: custo dos materiais fornecidos pela JMG"],
  ["negotiation_reserve", "Reserva para negociação (%)", "Acrescida ao preço para permitir descontos. Não é despesa."],
  ["architect_commission", "Comissão da arquiteta (%)", "Base: preço de venda da mão de obra após descontos. Nunca materiais."],
  ["desired_margin", "Margem desejada sobre a venda (%)", "Base: venda líquida. Usada só como referência/alerta."],
  ["min_margin", "Margem mínima sobre a venda (%)", "Abaixo disso o sistema alerta e limita o desconto sugerido."],
  ["reinvestment_share", "Destinação do resultado para reinvestimento (%)", "Base: resultado. É destinação, não é deduzido."],
];

function Precos({ ro }: { ro: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: async () => (await supabase.from("pricing_settings").select("*").maybeSingle()).data });
  const [f, setF] = useState<Partial<Pricing>>({});
  useEffect(() => data && setF(data), [data]);
  const taxes = (f.taxes as unknown as Tax[]) ?? [];
  const setTaxes = (t: Tax[]) => setF({ ...f, taxes: t as unknown as Pricing["taxes"] });
  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { configured: true, taxes: f.taxes ?? [] };
      for (const [k] of PCT_FIELDS) payload[k] = Number(f[k]) || 0;
      const { error } = await supabase.from("pricing_settings").update(payload as never).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regras salvas. Valem para novos orçamentos.");
      qc.invalidateQueries({ queryKey: ["pricing"] });
      qc.invalidateQueries({ queryKey: ["painel"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Percentuais padrão da JMG</CardTitle>
          {!data?.configured && <p className="text-sm text-warning-foreground">Ainda não configurado — todos estão em 0%.</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          {PCT_FIELDS.map(([k, l, h]) => (
            <div key={k} className="space-y-1">
              <Label>{l}</Label>
              <Input type="number" step="any" disabled={ro} value={(f[k] as number) ?? 0} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
              <p className="text-xs text-muted-foreground">{h}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Tributos e despesas sobre a venda</CardTitle>
          <p className="text-sm text-muted-foreground">Cadastre conforme orientação do seu contador. O sistema não presume alíquotas.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxes.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-5" disabled={ro} placeholder="Nome" value={t.name} onChange={(e) => setTaxes(taxes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <Input className="col-span-2" type="number" step="any" disabled={ro} value={t.rate} onChange={(e) => setTaxes(taxes.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) } : x)))} />
              <select className="col-span-4 h-10 rounded-md border border-input bg-background px-2 text-sm" disabled={ro} value={t.base} onChange={(e) => setTaxes(taxes.map((x, j) => (j === i ? { ...x, base: e.target.value as Tax["base"] } : x)))}>
                <option value="venda">sobre venda total</option>
                <option value="mao_de_obra">sobre mão de obra</option>
              </select>
              {!ro && (
                <Button variant="ghost" size="icon" className="col-span-1" aria-label="Remover" onClick={() => setTaxes(taxes.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {!ro && (
            <Button variant="outline" size="sm" onClick={() => setTaxes([...taxes, { name: "", rate: 0, base: "venda" }])}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          )}
        </CardContent>
      </Card>
      {!ro && (
        <div className="lg:col-span-2">
          <Button onClick={() => save.mutate()}>Salvar regras de precificação</Button>
        </div>
      )}
    </div>
  );
}

function Usuarios() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role) }));
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ uid, role, on }: { uid: string; role: Role; on: boolean }) => {
      if (!on && role === "admin" && uid === me?.id) throw new Error("Você não pode remover seu próprio acesso de administrador.");
      const { error } = on ? await supabase.from("user_roles").insert({ user_id: uid, role }) : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card className="mt-4 shadow-card">
      <CardContent className="divide-y p-0">
        {data.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{u.full_name || u.email}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
            {(["admin", "financeiro", "equipe"] as Role[]).map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-sm capitalize">
                <input type="checkbox" checked={u.roles.includes(r)} onChange={(e) => toggle.mutate({ uid: u.id, role: r, on: e.target.checked })} />
                {r === "equipe" ? "equipe de obra" : r}
              </label>
            ))}
          </div>
        ))}
        <p className="p-4 text-xs text-muted-foreground">
          Administrador e financeiro veem custos, margens e orçamentos. A equipe de obra não tem acesso a esses dados — o bloqueio é aplicado no banco de dados.
        </p>
      </CardContent>
    </Card>
  );
}

import { RecordDeleteButton, RecordTrash } from "@/components/management/record-deletion";
import { formatCpfCnpj, formatPhone, formatRg } from "@/lib/documents";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ListSkeleton, PageSkeleton } from "@/components/feedback";

type Person = Database["public"]["Tables"]["people"]["Row"];
type Kind = Database["public"]["Enums"]["person_kind"];

export const Route = createFileRoute("/_authenticated/cadastros")({
  validateSearch: (s: Record<string, unknown>): { kind?: string; edit?: string } => ({
    kind: typeof s["kind"] === "string" ? s["kind"] : "cliente",
    edit: typeof s["edit"] === "string" ? s["edit"] : "",
  }),
  head: () => pageMeta("Cadastros", "Clientes, arquitetos, fornecedores e prestadores da JMG."),
  component: Cadastros,
});

const KINDS: { k: Kind; label: string }[] = [
  { k: "cliente", label: "Clientes" },
  { k: "contato", label: "Contatos" },
  { k: "arquiteto", label: "Arquitetos" },
  { k: "fornecedor", label: "Fornecedores" },
  { k: "prestador", label: "Prestadores" },
];

const FIELDS: [keyof Person, string, string?][] = [
  ["name", "Nome / Razão social"],
  ["document", "CPF / CNPJ"],
  ["rg", "RG"],
  ["phone", "Telefone"],
  ["email", "E-mail"],
  ["endereco", "Endereço"],
  ["bairro", "Bairro"],
  ["cidade", "Cidade"],
  ["uf", "UF"],
  ["cep", "CEP"],
  ["specialty", "Especialidade / ramo"],
];

// Pontuação aplicada enquanto digita; o valor é salvo já pontuado.
const MASKS: Partial<Record<keyof Person, (v: string) => string>> = {
  document: formatCpfCnpj,
  rg: formatRg,
  phone: formatPhone,
};

// Busca aceita o documento com ou sem pontuação.
function matches(value: string, q: string) {
  const query = q.toLowerCase();
  if (value.toLowerCase().includes(query)) return true;
  const qDigits = q.replace(/\D/g, "");
  return qDigits.length > 0 && qDigits === q.trim() && value.replace(/\D/g, "").includes(qDigits);
}

function Cadastros() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const kind = KINDS.find((k) => k.k === search.kind)?.k ?? "cliente";
  const setKind = (kind: string) => navigate({ to: "/cadastros", search: { kind, edit: "" } });
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [edit, setEdit] = useState<Partial<Person> | null>(null);
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["people", kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .is("deleted_at", null)
        .eq("kind", kind)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (search.edit) {
      const p = data.find((p) => p.id === search.edit);
      if (p) setEdit(p);
    }
  }, [search.edit, data]);
  const save = useMutation({
    mutationFn: async (p: Partial<Person>) => {
      if (!p.name?.trim()) throw new Error("Informe o nome.");
      const payload = {
        ...p,
        kind: p.kind ?? kind,
        name: p.name.trim(),
        document: p.document ? formatCpfCnpj(p.document) : p.document,
        rg: p.rg ? formatRg(p.rg) : p.rg,
        phone: p.phone ? formatPhone(p.phone).replace(/\s*\/\s*$/, "") : p.phone,
      } as Person;
      const { error } = p.id
        ? await supabase.from("people").update(payload).eq("id", p.id)
        : await supabase.from("people").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo.");
      setEdit(null);
      navigate({ to: "/cadastros", search: { kind, edit: "" }, replace: true });
      qc.invalidateQueries({ queryKey: ["people"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const list = data.filter(
    (p) =>
      (showInactive || p.active) && [p.name, p.document, p.phone].some((v) => matches(v ?? "", q)),
  );

  return (
    <div>
      <PageHeader
        title="Cadastros"
        subtitle="Clientes, contatos, arquitetos, fornecedores e prestadores."
        actions={
          <>
            <RecordTrash entity="people" />
            <Button onClick={() => setEdit({ kind, active: true })}>
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </>
        }
      />
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
        <TabsList className="h-auto flex-wrap">
          {KINDS.map((k) => (
            <TabsTrigger key={k.k} value={k.k}>
              {k.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="my-4 flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Mostrar arquivados
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-y text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Especialidade</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-3">
                  <Link
                    to="/cadastros/$id"
                    params={{ id: p.id }}
                    className="font-medium text-primary"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap p-3">{p.phone ? formatPhone(p.phone) : "—"}</td>
                <td className="p-3">{p.email || "—"}</td>
                <td className="p-3">{p.specialty || "—"}</td>
                <td className="p-3 text-xs">{p.active ? "Ativo" : "Arquivado"}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => setEdit(p)}>
                    Editar
                  </Button>
                  <RecordDeleteButton entity="people" id={p.id} name={p.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <EmptyState
            compact
            icon={Users}
            title="Nenhum cadastro encontrado"
            description="Ajuste a busca ou cadastre uma nova pessoa."
          />
        )}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <SubmitForm onSubmit={() => edit && save.mutate(edit)} pending={save.isPending}>
            <DialogHeader>
              <DialogTitle>{edit?.id ? "Editar cadastro" : "Novo cadastro"}</DialogTitle>
            </DialogHeader>
            {edit && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Tipo</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={edit.kind ?? kind}
                    onChange={(e) => setEdit({ ...edit, kind: e.target.value as Kind })}
                  >
                    {KINDS.map((k) => (
                      <option key={k.k} value={k.k}>
                        {k.label.slice(0, -1)}
                      </option>
                    ))}
                  </select>
                </div>
                {FIELDS.map(([f, l]) => (
                  <div
                    key={f}
                    className={
                      f === "name" || f === "endereco" ? "space-y-1 sm:col-span-2" : "space-y-1"
                    }
                  >
                    <Label>{l}</Label>
                    <Input
                      value={(edit[f] as string) ?? ""}
                      inputMode={f === "document" ? "numeric" : f === "phone" ? "tel" : undefined}
                      onChange={(e) =>
                        setEdit({ ...edit, [f]: MASKS[f]?.(e.target.value) ?? e.target.value })
                      }
                    />
                  </div>
                ))}
                <div className="space-y-1 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={edit.notes ?? ""}
                    onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={edit.active ?? true}
                    onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                  />{" "}
                  Ativo
                </label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEdit(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </SubmitForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CLAUSE_TOKENS, unknownTokens } from "@/lib/contract-clauses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/kpi";
import { EmptyState, ListSkeleton } from "@/components/feedback";
import { cn } from "@/lib/utils";

// Configurações → Contrato: modelo de cláusulas usado no PDF do contrato gerado a partir do
// orçamento aprovado. Mudanças valem só para contratos gerados depois.

type Clause = Database["public"]["Tables"]["contract_clauses"]["Row"];
const KEY = ["contract-clauses"];

async function check<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export function ContractClausesSettings({ ro }: { ro: boolean }) {
  const qc = useQueryClient();
  const { data: clauses, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () =>
      (await check(supabase.from("contract_clauses").select("*").order("sort"))) ?? [],
  });
  const done = (msg?: string) => {
    void qc.invalidateQueries({ queryKey: KEY });
    if (msg) toast.success(msg);
  };
  const fail = (e: Error) => toast.error(e.message);

  const add = useMutation({
    mutationFn: () =>
      check(
        supabase.from("contract_clauses").insert({
          title: "Nova cláusula",
          body: "{{N}}.1. ",
          sort: Math.max(0, ...(clauses ?? []).map((c) => c.sort)) + 1,
        }),
      ),
    onSuccess: () => done("Cláusula incluída no fim."),
    onError: fail,
  });
  const move = useMutation({
    mutationFn: async ({ i, dir }: { i: number; dir: -1 | 1 }) => {
      const list = clauses ?? [];
      const a = list[i];
      const b = list[i + dir];
      if (!a || !b) return;
      await check(supabase.from("contract_clauses").update({ sort: b.sort }).eq("id", a.id));
      await check(supabase.from("contract_clauses").update({ sort: a.sort }).eq("id", b.id));
    },
    onSuccess: () => done(),
    onError: fail,
  });

  if (isLoading) return <ListSkeleton rows={4} />;
  const list = clauses ?? [];
  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardContent className="space-y-2 p-4 text-sm sm:p-6">
          <p>
            Estas cláusulas montam o <b>contrato em PDF</b> gerado a partir do orçamento aprovado,
            na ordem abaixo. Alterar aqui vale só para contratos gerados depois; contratos já
            assinados não mudam.
          </p>
          <p className="text-muted-foreground">
            Cada linha vira um parágrafo. “{"{{N}}"}.1.” leva o número em destaque, “{"{{N}}"}.1.1.”
            e incisos romanos (I –, II –) ficam recuados, linhas começando com “- ” viram itens e
            **texto** sai em negrito. Marcadores que o sistema preenche com os dados do orçamento:
          </p>
          <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {CLAUSE_TOKENS.map((t) => (
              <li key={t.token}>
                <code className="rounded bg-muted px-1 py-0.5 text-foreground">{t.token}</code>{" "}
                {t.help}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {!list.length && (
        <EmptyState
          title="Sem cláusulas"
          description="Sem cláusulas o contrato não pode ser gerado. Inclua a primeira."
        />
      )}
      {list.map((c, i) => (
        <ClauseCard
          key={c.id}
          clause={c}
          number={list.slice(0, i + 1).filter((x) => x.active).length}
          ro={ro}
          first={i === 0}
          last={i === list.length - 1}
          onMove={(dir) => move.mutate({ i, dir })}
          onChanged={done}
        />
      ))}
      {!ro && (
        <Button
          type="button"
          variant="outline"
          onClick={() => add.mutate()}
          disabled={add.isPending}
        >
          <Plus className="h-4 w-4" /> Incluir cláusula
        </Button>
      )}
    </div>
  );
}

function ClauseCard({
  clause,
  number,
  ro,
  first,
  last,
  onMove,
  onChanged,
}: {
  clause: Clause;
  number: number;
  ro: boolean;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onChanged: (msg?: string) => void;
}) {
  const [title, setTitle] = useState(clause.title);
  const [body, setBody] = useState(clause.body);
  useEffect(() => {
    setTitle(clause.title);
    setBody(clause.body);
  }, [clause.title, clause.body]);
  const dirty = title !== clause.title || body !== clause.body;
  const unknown = unknownTokens(body);
  const fail = (e: Error) => toast.error(e.message);

  const save = useMutation({
    mutationFn: () =>
      check(
        supabase.from("contract_clauses").update({ title: title.trim(), body }).eq("id", clause.id),
      ),
    onSuccess: () => onChanged("Cláusula salva."),
    onError: fail,
  });
  const toggle = useMutation({
    mutationFn: (active: boolean) =>
      check(supabase.from("contract_clauses").update({ active }).eq("id", clause.id)),
    onSuccess: () => onChanged(),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => check(supabase.from("contract_clauses").delete().eq("id", clause.id)),
    onSuccess: () => onChanged("Cláusula removida."),
    onError: fail,
  });

  return (
    <Card className={cn("shadow-card", !clause.active && "opacity-60")}>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {clause.active ? number : "–"}
          </span>
          <Input
            aria-label="Título da cláusula"
            className="min-w-0 flex-1 basis-48 font-semibold"
            value={title}
            disabled={ro}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={clause.active}
              disabled={ro}
              onCheckedChange={(v) => toggle.mutate(v)}
              aria-label="Usar esta cláusula no contrato"
            />
            {clause.active ? "No contrato" : "Fora do contrato"}
          </label>
          {!ro && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Subir cláusula"
                disabled={first}
                onClick={() => onMove(-1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Descer cláusula"
                disabled={last}
                onClick={() => onMove(1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remover cláusula"
                className="text-muted-foreground hover:text-negative"
                onClick={() => {
                  if (window.confirm(`Remover a cláusula “${clause.title}” do modelo?`))
                    remove.mutate();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <Textarea
          aria-label={`Texto da cláusula ${clause.title}`}
          rows={Math.min(18, Math.max(4, body.split("\n").length + 1))}
          className="font-mono text-xs leading-relaxed"
          value={body}
          disabled={ro}
          onChange={(e) => setBody(e.target.value)}
        />
        {unknown.length > 0 && (
          <Notice tone="negative">
            Marcador desconhecido: {unknown.map((t) => `{{${t}}}`).join(", ")}. Ele sairia no
            contrato do jeito que está escrito.
          </Notice>
        )}
        {!ro && dirty && (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTitle(clause.title);
                setBody(clause.body);
              }}
            >
              Desfazer
            </Button>
            <Button
              type="button"
              onClick={() => save.mutate()}
              disabled={!title.trim() || save.isPending}
            >
              Salvar cláusula
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

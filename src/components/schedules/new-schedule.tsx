import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { worksOptions } from "@/lib/work-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Memo, selectClass } from "@/components/works/fields";
import { text } from "@/lib/form-values";
export function NewSchedule({ copyId }: { copyId?: string }) {
  const [open, setOpen] = useState(false),
    [mode, setMode] = useState(copyId ? "avulso" : "");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient(),
    navigate = useNavigate();
  const { data: works = [] } = useQuery(worksOptions);
  const { data: budgets = [] } = useQuery({
    queryKey: ["schedule-budget-options"],
    enabled: open,
    queryFn: async () => {
      const r = await supabase
        .from("budgets")
        .select("id,title,number,client_display")
        .is("deleted_at", null)
        .eq("archived", false);
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const { data: people = [] } = useQuery({
    queryKey: ["schedule-people-options"],
    enabled: open,
    queryFn: async () => {
      const r = await supabase
        .from("people")
        .select("id,name")
        .is("deleted_at", null)
        .eq("kind", "cliente");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  async function save(d: FormData) {
    setBusy(true);
    try {
      const clientId = text(d, "client_id");
      const data = {
        name: text(d, "name"),
        client_id: clientId,
        client_name: people.find((p) => p.id === clientId)?.name || text(d, "client_name"),
        address: text(d, "address"),
        description: text(d, "description"),
        planned_start: text(d, "planned_start"),
        planned_end: text(d, "planned_end"),
        responsible: text(d, "responsible"),
        notes: text(d, "notes"),
      };
      const r = await supabase.rpc("create_schedule", {
        _data: mode === "avulso" ? data : {},
        ...(mode === "obra" ? { _work_id: text(d, "source") } : {}),
        ...(mode === "orcamento" ? { _budget_id: text(d, "source") } : {}),
        ...(copyId ? { _copy_id: copyId } : {}),
      });
      if (r.error) throw r.error;
      qc.invalidateQueries({ queryKey: ["schedules"] });
      qc.invalidateQueries({ queryKey: ["work"] });
      setOpen(false);
      navigate({ to: "/cronogramas/$id", params: { id: r.data } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant={copyId ? "outline" : "default"}
        onClick={() => {
          setMode(copyId ? "avulso" : "");
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        {copyId ? "Duplicar Cronograma" : "Novo Cronograma"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{copyId ? "Duplicar Cronograma" : "Novo Cronograma"}</DialogTitle>
          </DialogHeader>
          {!mode ? (
            <div className="grid gap-3">
              <Button variant="outline" onClick={() => setMode("obra")}>
                Criar a partir de uma obra existente
              </Button>
              <Button variant="outline" onClick={() => setMode("orcamento")}>
                Criar a partir de um orçamento existente
              </Button>
              <Button variant="outline" onClick={() => setMode("avulso")}>
                Criar cronograma avulso
              </Button>
            </div>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                save(new FormData(e.currentTarget));
              }}
            >
              {mode === "avulso" ? (
                <>
                  <Field name="name" label="Nome da obra/projeto" required capitalize />
                  <label className="text-sm">
                    Cliente cadastrado
                    <select name="client_id" className={selectClass}>
                      <option value="">Informar nome abaixo</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field name="client_name" label="Nome do cliente" capitalize />
                  <Field name="address" label="Local da obra" capitalize />
                  <Field name="responsible" label="Responsável" capitalize />
                  <Field name="planned_start" label="Data prevista de início" type="date" />
                  <Field name="planned_end" label="Data prevista de término" type="date" />
                  <Memo name="description" label="Descrição" />
                  <Memo name="notes" label="Observações" />
                </>
              ) : (
                <label className="text-sm sm:col-span-2">
                  {mode === "obra" ? "Obra" : "Orçamento"}
                  <select name="source" required className={selectClass}>
                    <option value="">Selecionar</option>
                    {mode === "obra"
                      ? works.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))
                      : budgets.map((b) => (
                          <option key={b.id} value={b.id}>
                            #{b.number} · {b.title} · {b.client_display}
                          </option>
                        ))}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Criando…" : mode === "obra" ? "Abrir cronograma" : "Criar cronograma"}
                </Button>
                {!copyId && (
                  <Button type="button" variant="ghost" onClick={() => setMode("")}>
                    Voltar
                  </Button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

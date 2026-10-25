import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Copy, Trash2, ArrowUp, ArrowDown, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { EditableStage, ScheduleHeader } from "@/lib/schedule-data";
import { calendarDays, endFromDuration, snapshotStages } from "@/lib/work-schedule";
import { Gantt } from "@/components/works/gantt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Memo, text, number, selectClass } from "@/components/works/fields";
import { fmtDate, fmtNum } from "@/lib/format";
import { useMe } from "@/hooks/use-me";
type Version = {
  id: string;
  version: number;
  stages: Json;
  notes: string | null;
  reason: string;
  created_at: string;
  created_by: string | null;
};
export function StandaloneEditor({
  header,
  stages,
  versions,
  onChange,
}: {
  header: ScheduleHeader;
  stages: EditableStage[];
  versions: Version[];
  onChange: () => void;
}) {
  const { data: me } = useMe();
  const [editing, setEditing] = useState<EditableStage | null>(null),
    [open, setOpen] = useState(false),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [version, setVersion] = useState("current"),
    [pending, setPending] = useState<EditableStage[] | null>(null),
    [busy, setBusy] = useState(false);
  const saved = versions.find((v) => String(v.version) === version);
  const base = versions[0];
  const begin = (s: EditableStage | null) => {
    setEditing(s);
    setStart(s?.planned_start ?? "");
    setEnd(s?.planned_end ?? "");
    setOpen(true);
  };
  async function persist(
    next: EditableStage[],
    reason = "",
    approve = false,
    notes = header.notes ?? "",
  ) {
    setBusy(true);
    try {
      const r = await supabase.rpc("save_standalone_schedule", {
        _id: header.id,
        _stages: next,
        _notes: notes,
        _reason: reason,
        _approve: approve,
      });
      if (r.error) throw r.error;
      setPending(null);
      setOpen(false);
      onChange();
      toast.success(approve ? "Cronograma original preservado." : "Cronograma salvo.");
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function change(next: EditableStage[]) {
    if (base) setPending(next);
    else void persist(next);
  }
  async function save(d: FormData) {
    const weight = number(d, "weight"),
      progress = number(d, "progress");
    if (weight > 100 || progress > 100) {
      toast.error("Informe percentuais entre 0 e 100%.");
      return;
    }
    const s: EditableStage = {
      id: editing?.id ?? crypto.randomUUID(),
      name: text(d, "name"),
      sort: editing?.sort ?? stages.length,
      planned_start: start || null,
      planned_end: end || null,
      actual_start: text(d, "actual_start") || null,
      actual_end: text(d, "actual_end") || null,
      dependency_id: text(d, "dependency") || null,
      weight,
      progress,
      status: progress === 100 ? "concluido" : text(d, "status"),
      responsible: text(d, "responsible"),
      observations: text(d, "observations"),
      scope_services: text(d, "scope_services"),
    };
    const next = editing ? stages.map((x) => (x.id === editing.id ? s : x)) : [...stages, s];
    await persist(next, text(d, "reason"));
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {base
            ? `Original preservado · ${versions.length} versões`
            : "Em elaboração · original ainda não aprovado"}
        </p>
        <div className="flex flex-wrap gap-2">
          {me?.canSeeCosts && !base && (
            <Button
              variant="outline"
              disabled={busy || !stages.length}
              onClick={() => setPending(stages)}
            >
              <LockKeyhole className="h-4 w-4" />
              Aprovar cronograma original
            </Button>
          )}
          {me?.canSeeCosts && (
            <Button variant="outline" onClick={() => begin(null)}>
              <Plus className="h-4 w-4" />
              Nova etapa
            </Button>
          )}
        </div>
      </div>
      <label className="block max-w-sm text-sm">
        Versão
        <select
          aria-label="Versão do cronograma"
          className={selectClass}
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        >
          <option value="current">Cronograma Atual × Original</option>
          {versions.map((v) => (
            <option key={v.id} value={v.version}>
              {v.version === 1 ? "Cronograma Original" : `Reprogramação ${v.version - 1}`}
            </option>
          ))}
        </select>
      </label>
      <Gantt
        stages={saved ? snapshotStages(saved.stages) : stages}
        original={!saved && base ? snapshotStages(base.stages) : []}
        onSelect={
          !saved && me?.canSeeCosts
            ? (id) => begin(stages.find((s) => s.id === id) ?? null)
            : undefined
        }
      />
      <div className="divide-y">
        {stages.map((s, i) => (
          <article key={s.id} className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <h3 className="break-words font-semibold">{s.name}</h3>
              <p className="text-xs text-muted-foreground">
                {fmtDate(s.planned_start)} → {fmtDate(s.planned_end)} ·{" "}
                {calendarDays(s.planned_start, s.planned_end) ?? "—"} dias · {fmtNum(s.progress)}%
              </p>
              {s.scope_services && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                  {s.scope_services}
                </p>
              )}
              {s.dependency_id && (
                <p className="text-xs text-muted-foreground">
                  Dependência: {stages.find((x) => x.id === s.dependency_id)?.name}
                </p>
              )}
            </div>
            {me?.canSeeCosts && (
              <div className="flex flex-wrap gap-1">
                {[-1, 1].map((delta) => (
                  <Button
                    key={delta}
                    variant="ghost"
                    size="icon"
                    title={delta < 0 ? "Subir" : "Descer"}
                    aria-label={`${delta < 0 ? "Subir" : "Descer"} ${s.name}`}
                    disabled={i + delta < 0 || i + delta >= stages.length}
                    onClick={() => {
                      const next = [...stages];
                      const other = next[i + delta];
                      if (other) {
                        next[i] = other;
                        next[i + delta] = s;
                        change(next.map((x, sort) => ({ ...x, sort })));
                      }
                    }}
                  >
                    {delta < 0 ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${s.name}`}
                  title="Editar etapa"
                  onClick={() => begin(s)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Duplicar ${s.name}`}
                  title="Duplicar etapa"
                  onClick={() =>
                    change([
                      ...stages,
                      {
                        ...s,
                        id: crypto.randomUUID(),
                        name: s.name + " · cópia",
                        sort: stages.length,
                        progress: 0,
                        status: "nao_iniciado",
                        actual_start: null,
                        actual_end: null,
                      },
                    ])
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir ${s.name}`}
                  title="Excluir etapa"
                  onClick={() => {
                    if (stages.some((x) => x.dependency_id === s.id)) {
                      toast.error("Remova as dependências desta etapa antes de excluir.");
                      return;
                    }
                    setPending(stages.filter((x) => x.id !== s.id));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      <form
        className="space-y-3 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          void persist(stages, text(d, "reason"), false, text(d, "notes"));
        }}
      >
        <Memo
          name="notes"
          label="Observações gerais do cronograma"
          value={saved?.notes ?? header.notes}
        />
        {me?.canSeeCosts && !saved && (
          <>
            {base && <Memo name="reason" label="Motivo da alteração" />}
            <Button variant="outline" disabled={busy}>
              Salvar observações
            </Button>
          </>
        )}
      </form>
      {versions.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer">Histórico de versões</summary>
          {versions.map((v) => (
            <div key={v.id} className="border-b py-3">
              <p className="font-semibold">
                Versão {v.version} · {new Date(v.created_at).toLocaleString("pt-BR")}
              </p>
              <p>{v.reason}</p>
              <p className="text-xs text-muted-foreground">
                {v.created_by === me?.id ? me.name : "Autoria registrada"}
              </p>
            </div>
          ))}
        </details>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar etapa" : "Nova etapa"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void save(new FormData(e.currentTarget));
            }}
          >
            <Field label="Nome da etapa" name="name" required value={editing?.name} />
            <Field label="Responsável" name="responsible" value={editing?.responsible} />
            <label className="text-sm">
              Início previsto
              <input
                aria-label="Início previsto"
                type="date"
                required
                className={selectClass}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Término previsto
              <input
                aria-label="Término previsto"
                type="date"
                required
                min={start || undefined}
                className={selectClass}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Quantidade de dias prevista
              <input
                aria-label="Quantidade de dias prevista"
                type="number"
                min="1"
                className={selectClass}
                value={calendarDays(start, end) ?? ""}
                onChange={(e) => setEnd(endFromDuration(start, Number(e.target.value)))}
              />
            </label>
            <label className="text-sm">
              Dependência
              <select
                name="dependency"
                className={selectClass}
                defaultValue={editing?.dependency_id ?? ""}
              >
                <option value="">Nenhuma</option>
                {stages
                  .filter((s) => s.id !== editing?.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <Field
              name="weight"
              label="Peso no avanço (%)"
              type="number"
              value={editing?.weight ?? (stages.length ? 0 : 100)}
            />
            <Field
              name="progress"
              label="Percentual concluído (%)"
              type="number"
              value={editing?.progress ?? 0}
            />
            <label className="text-sm">
              Situação
              <select
                name="status"
                className={selectClass}
                defaultValue={editing?.status ?? "nao_iniciado"}
              >
                <option value="nao_iniciado">Não iniciado</option>
                <option value="andamento">Em andamento</option>
                <option value="pausado">Pausado</option>
                <option value="concluido">Concluído</option>
              </select>
            </label>
            <Field
              name="actual_start"
              label="Início real"
              type="date"
              value={editing?.actual_start}
            />
            <Field name="actual_end" label="Término real" type="date" value={editing?.actual_end} />
            <Memo name="scope_services" label="Serviços" value={editing?.scope_services} />
            <Memo name="observations" label="Observações" value={editing?.observations} />
            {base && <Memo name="reason" label="Motivo da reprogramação" />}
            <Button disabled={busy}>Salvar etapa</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pending}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {!base && pending === stages
                ? "Aprovar cronograma original"
                : "Confirmar alteração das etapas"}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (pending)
                void persist(
                  pending,
                  text(new FormData(e.currentTarget), "reason"),
                  !base && pending === stages,
                );
            }}
          >
            {base ? (
              <Memo name="reason" label="Motivo da reprogramação" />
            ) : (
              <p className="text-sm">
                {pending === stages
                  ? "O original será preservado e alterações futuras terão histórico."
                  : "Confirmar alteração deste planejamento?"}
              </p>
            )}
            <Button disabled={busy}>Confirmar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitForm } from "@/components/enter-submit";
import { MoneyInput } from "@/components/money-input";
import { maskBRL, parseBRL } from "@/lib/money";
import { commitOnEnter } from "@/lib/enter-submit";
import { capitalizeWordsProps } from "@/lib/text-case";
import { stageCosts } from "@/lib/operations";
import { financeOptions } from "@/lib/finance-data";
import {
  stageServicesOptions,
  stageValuesOptions,
  syncStageProgress,
  type StageService,
} from "@/lib/stage-services-data";
import { fmtBRL, fmtNum } from "@/lib/format";
import { Money } from "@/components/kpi";

type Stage = Database["public"]["Tables"]["work_stages"]["Row"];
const tile = "min-w-0 rounded-xl bg-muted/50 p-3";

export function StageServicesPanel({
  workId,
  stage,
  onChange,
}: {
  workId: string;
  stage: Stage;
  onChange: () => void;
}) {
  const qc = useQueryClient();
  const { data: all = [] } = useQuery(stageServicesOptions(workId));
  const { data: finance } = useQuery(financeOptions);
  const { data: values = [] } = useQuery(stageValuesOptions(workId));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ description: "", labor: "", material: "" });
  const [busy, setBusy] = useState(false);
  const services = all.filter((s) => s.stage_id === stage.id);
  const costs = stageCosts(
    stage.id,
    services,
    (finance?.entries ?? []).filter((e) => e.work_id === workId),
    finance?.settlements ?? [],
    values.find((v) => v.stage_id === stage.id),
  );

  async function after(next: StageService[]) {
    await syncStageProgress(stage, next);
    await qc.invalidateQueries({ queryKey: ["stage-services", workId] });
    await qc.invalidateQueries({ queryKey: ["work-checklist", workId] });
    onChange();
  }
  async function update(s: StageService, patch: Partial<StageService>) {
    const r = await supabase.from("work_stage_services").update(patch).eq("id", s.id);
    if (r.error) return void toast.error(r.error.message);
    try {
      await after(services.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function remove(s: StageService) {
    if (!confirm(`Remover o serviço "${s.description}" desta etapa?`)) return;
    const r = await supabase.from("work_stage_services").delete().eq("id", s.id);
    if (r.error) return void toast.error(r.error.message);
    try {
      await after(services.filter((x) => x.id !== s.id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function add() {
    if (!draft.description.trim()) return void toast.error("Informe o serviço.");
    setBusy(true);
    const r = await supabase
      .from("work_stage_services")
      .insert({
        work_id: workId,
        stage_id: stage.id,
        description: draft.description.trim(),
        labor_planned: parseBRL(draft.labor),
        material_planned: parseBRL(draft.material),
        sort: Math.max(-1, ...services.map((s) => s.sort)) + 1,
      })
      .select("*")
      .single();
    setBusy(false);
    if (r.error) return void toast.error(r.error.message);
    setDraft({ description: "", labor: "", material: "" });
    try {
      await after([...services, r.data]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const usedPct = costs.planned > 0 ? (costs.spent / costs.planned) * 100 : 0;
  const split = (labor: number, material: number) =>
    `Etapa ${fmtBRL(labor)} · Mat. ${fmtBRL(material)}`;
  return (
    <div className="mt-4 text-sm">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className={tile}>
          <dt className="text-xs text-muted-foreground">Valor previsto</dt>
          <dd className="font-semibold">
            <Money value={costs.planned} />
          </dd>
          <dd className="text-xs text-muted-foreground">
            {split(costs.laborPlanned, costs.materialPlanned)}
          </dd>
        </div>
        <div className={tile}>
          <dt className="text-xs text-muted-foreground">Já pago</dt>
          <dd className="font-semibold">
            <Money value={costs.spent} tone="negative" />
            {costs.planned > 0 && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({fmtNum(usedPct, 0)}%)
              </span>
            )}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {split(costs.laborSpent, costs.materialSpent)}
            {costs.otherSpent > 0 && ` · Outros ${fmtBRL(costs.otherSpent)}`}
          </dd>
        </div>
        <div className={tile}>
          <dt className="text-xs text-muted-foreground">Restante a pagar</dt>
          <dd className="font-semibold">
            <Money value={costs.balance} tone="auto" />
          </dd>
          <dd className="text-xs text-muted-foreground">
            {costs.balance < 0
              ? "Acima do previsto"
              : split(costs.laborBalance, costs.materialBalance)}
          </dd>
        </div>
        <div className={tile}>
          <dt className="text-xs text-muted-foreground">Contas em aberto</dt>
          <dd className="font-semibold">
            <Money value={costs.committed} tone={costs.committed > 0 ? "alert" : "inherit"} />
          </dd>
          <dd className="text-xs text-muted-foreground">Lançadas, ainda não pagas</dd>
        </div>
      </dl>

      <button
        type="button"
        className="mt-3 flex min-h-10 items-center gap-1 text-left text-xs font-medium text-primary"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Serviços da etapa ({services.length})
        {services.length > 0
          ? " · o valor e o avanço da etapa vêm deles"
          : " · opcional, para detalhar a etapa"}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {services.length > 0 && (
            <div className="hidden grid-cols-12 gap-2 text-xs text-muted-foreground sm:grid">
              <span className="col-span-5">Serviço</span>
              <span className="col-span-2">MO prevista</span>
              <span className="col-span-2">Material previsto</span>
              <span className="col-span-2">Avanço %</span>
            </div>
          )}
          {services.map((s) => (
            <div key={s.id} className="grid grid-cols-12 items-center gap-2">
              <Input
                className="col-span-12 sm:col-span-5"
                aria-label="Serviço"
                defaultValue={s.description}
                onKeyDown={commitOnEnter}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value.trim() !== s.description &&
                  update(s, { description: e.target.value.trim() })
                }
              />
              <MoneyInput
                key={`${s.id}-labor_planned-${s.labor_planned}`}
                className="col-span-4 sm:col-span-2"
                aria-label="Mão de obra prevista"
                value={s.labor_planned}
                onKeyDown={commitOnEnter}
                onCommit={(v) => update(s, { labor_planned: v })}
              />
              <MoneyInput
                key={`${s.id}-material_planned-${s.material_planned}`}
                className="col-span-4 sm:col-span-2"
                aria-label="Material previsto"
                value={s.material_planned}
                onKeyDown={commitOnEnter}
                onCommit={(v) => update(s, { material_planned: v })}
              />
              <Input
                key={`${s.id}-${s.progress}`}
                className="col-span-3 sm:col-span-2 num"
                aria-label={`Avanço ${s.description}`}
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={s.progress}
                onKeyDown={commitOnEnter}
                onBlur={(e) => {
                  const p = Number(e.target.value);
                  if (!Number.isFinite(p) || p < 0 || p > 100)
                    return void toast.error("Informe um avanço entre 0 e 100%.");
                  if (p !== s.progress) update(s, { progress: p });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="col-span-1"
                aria-label={`Remover ${s.description}`}
                onClick={() => remove(s)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <SubmitForm
            onSubmit={add}
            pending={busy}
            className="grid grid-cols-12 items-center gap-2"
          >
            <Input
              className="col-span-12 sm:col-span-5"
              placeholder="Novo serviço (ex.: Assentamento de porcelanato)"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              {...capitalizeWordsProps}
            />
            <Input
              className="col-span-4 sm:col-span-2"
              placeholder="MO R$ 0,00"
              inputMode="numeric"
              value={draft.labor}
              onChange={(e) => setDraft({ ...draft, labor: maskBRL(e.target.value) })}
            />
            <Input
              className="col-span-4 sm:col-span-2"
              placeholder="Material R$ 0,00"
              inputMode="numeric"
              value={draft.material}
              onChange={(e) => setDraft({ ...draft, material: maskBRL(e.target.value) })}
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="col-span-4 sm:col-span-3"
              disabled={busy}
            >
              <Plus className="h-4 w-4" />
              Serviço
            </Button>
          </SubmitForm>
          <p className="text-xs text-muted-foreground">
            O gasto real vem das saídas e contas a pagar do Financeiro lançadas nesta etapa
            (categoria Mão de obra ou Materiais).
          </p>
        </div>
      )}
    </div>
  );
}

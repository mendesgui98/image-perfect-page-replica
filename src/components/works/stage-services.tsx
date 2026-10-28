import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitForm } from "@/components/enter-submit";
import { commitOnEnter } from "@/lib/enter-submit";
import { capitalizeWordsProps } from "@/lib/text-case";
import { stageCosts } from "@/lib/operations";
import { financeOptions } from "@/lib/finance-data";
import {
  stageServicesOptions,
  syncStageProgress,
  type StageService,
} from "@/lib/stage-services-data";
import { fmtBRL, fmtNum } from "@/lib/format";

type Stage = Database["public"]["Tables"]["work_stages"]["Row"];

const money = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ description: "", labor: "", material: "" });
  const [busy, setBusy] = useState(false);
  const services = all.filter((s) => s.stage_id === stage.id);
  const costs = stageCosts(
    stage.id,
    services,
    (finance?.entries ?? []).filter((e) => e.work_id === workId),
    finance?.settlements ?? [],
  );

  async function after(next: StageService[]) {
    await syncStageProgress(stage, next);
    await qc.invalidateQueries({ queryKey: ["stage-services", workId] });
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
        labor_planned: money(draft.labor),
        material_planned: money(draft.material),
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
  return (
    <div className="mt-4 border-t pt-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Valor previsto</dt>
          <dd className="font-semibold num">{fmtBRL(costs.planned)}</dd>
          <dd className="text-xs text-muted-foreground">
            MO {fmtBRL(costs.laborPlanned)} · Mat. {fmtBRL(costs.materialPlanned)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Já pago</dt>
          <dd className="font-semibold num">{fmtBRL(costs.spent)}</dd>
          <dd className="text-xs text-muted-foreground">
            {costs.planned > 0
              ? `${fmtNum(usedPct, 0)}% do previsto`
              : `MO ${fmtBRL(costs.laborSpent)} · Mat. ${fmtBRL(costs.materialSpent)}`}
            {costs.otherSpent > 0 && ` · Outros ${fmtBRL(costs.otherSpent)}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Restante a pagar</dt>
          <dd className={`font-semibold num ${costs.balance < 0 ? "text-destructive" : ""}`}>
            {fmtBRL(costs.balance)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {costs.balance < 0 ? "Acima do previsto" : "Previsto − já pago"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Contas em aberto</dt>
          <dd className="font-semibold num">{fmtBRL(costs.committed)}</dd>
          <dd className="text-xs text-muted-foreground">Lançadas, ainda não pagas</dd>
        </div>
      </dl>

      <button
        type="button"
        className="mt-3 flex items-center gap-1 text-xs font-medium text-primary"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Serviços da etapa ({services.length})
        {services.length > 0 && " · o avanço da etapa é calculado por eles"}
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
              <Input
                className="col-span-4 sm:col-span-2 num"
                aria-label="Mão de obra prevista"
                type="number"
                min="0"
                step="0.01"
                defaultValue={s.labor_planned}
                onKeyDown={commitOnEnter}
                onBlur={(e) =>
                  money(e.target.value) !== s.labor_planned &&
                  update(s, { labor_planned: money(e.target.value) })
                }
              />
              <Input
                className="col-span-4 sm:col-span-2 num"
                aria-label="Material previsto"
                type="number"
                min="0"
                step="0.01"
                defaultValue={s.material_planned}
                onKeyDown={commitOnEnter}
                onBlur={(e) =>
                  money(e.target.value) !== s.material_planned &&
                  update(s, { material_planned: money(e.target.value) })
                }
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
              placeholder="MO R$"
              type="number"
              min="0"
              step="0.01"
              value={draft.labor}
              onChange={(e) => setDraft({ ...draft, labor: e.target.value })}
            />
            <Input
              className="col-span-4 sm:col-span-2"
              placeholder="Material R$"
              type="number"
              min="0"
              step="0.01"
              value={draft.material}
              onChange={(e) => setDraft({ ...draft, material: e.target.value })}
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

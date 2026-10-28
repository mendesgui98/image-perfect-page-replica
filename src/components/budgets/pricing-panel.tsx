import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { budgetApi } from "@/lib/budget-api";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Item } from "@/lib/budget-data";
import { computeBudget, type BudgetResult, type PricingParams } from "@/lib/pricing";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { Money } from "@/components/kpi";
import { cn } from "@/lib/utils";

const PARAM_FIELDS: [keyof PricingParams, string][] = [
  ["labor_markup", "Acréscimo MO (% s/ custo)"],
  ["materials_markup", "Acréscimo mat. (% s/ custo)"],
  ["negotiation_reserve", "Reserva negociação (%)"],
  ["architect_commission", "Comissão arquiteta (% s/ MO)"],
  ["desired_margin", "Margem desejada (% s/ venda)"],
  ["min_margin", "Margem mínima (% s/ venda)"],
  ["reinvestment_share", "Reinvestimento (% do resultado)"],
];

export function PricingPanel({
  budgetId,
  params,
  discount,
  items,
  result,
  locked,
  onApplied,
}: {
  budgetId: string;
  params: PricingParams;
  discount: number;
  items: Item[];
  result: BudgetResult;
  locked: boolean;
  onApplied: () => void;
}) {
  const [draft, setDraft] = useState(params);
  const [disc, setDisc] = useState(discount);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    setDraft(params);
    setDisc(discount);
  }, [params, discount]);
  const sim = useMemo(() => computeBudget(items, draft, disc), [items, draft, disc]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(params) || disc !== discount;

  async function apply() {
    try {
      await budgetApi.update(budgetId, { params: draft as never, general_discount: disc });
      await budgetApi.logHistory({
        budget_id: budgetId,
        action: "precificacao",
        summary: {
          antes: { params, desconto: discount, total: result.saleNet, margem: result.margin },
          depois: { params: draft, desconto: disc, total: sim.saleNet, margem: sim.margin },
        } as never,
      });
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    toast.success("Precificação aplicada.");
    setConfirming(false);
    onApplied();
  }

  return (
    <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resultado interno</CardTitle>
          <p className="text-xs text-muted-foreground">Não aparece no documento do cliente.</p>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 text-sm [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <div className="space-y-1.5">
            <Row l="Custo mão de obra (terceiros)" v={result.laborCost} />
            <Row l="Custo materiais (JMG)" v={result.materialsCost} />
          </div>
          <div className="space-y-1.5">
            <Row l="Preço lista" v={result.listTotal} muted />
            <Row l="  dos quais reserva de negociação" v={result.reserveAmount} muted />
            <Row l="Descontos (itens + geral)" v={-result.totalDiscount} />
            <Row l="Venda mão de obra" v={result.laborNet} />
            <Row l="Venda materiais" v={result.materialsNet} />
            <Row l="Total ao cliente" v={result.saleNet} strong />
          </div>
          <div className="space-y-1.5">
            {result.taxes.map((t) => (
              <Row
                key={t.name}
                l={`${t.name} (${fmtNum(t.rate)}% s/ ${t.base === "venda" ? "venda" : "MO"})`}
                v={-t.amount}
              />
            ))}
            <Row l="Comissão arquiteta (s/ MO líquida)" v={-result.commission} />
          </div>
          <div className="space-y-1.5">
            <Row l="Resultado estimado" v={result.result} strong />
            <div className="flex justify-between gap-2">
              <span>Margem sobre a venda</span>
              <span className={`font-semibold num ${result.belowMin ? "text-negative" : ""}`}>
                {fmtPct(result.margin)}
              </span>
            </div>
            <Row l="Destinação a reinvestimento" v={result.reinvestment} muted />
          </div>
          <div className="space-y-2">
            <div className="rounded-xl bg-neutral-soft px-3 py-2.5 text-xs text-muted-foreground">
              Desconto adicional possível mantendo a margem mínima:{" "}
              <Money value={result.maxExtraDiscount} className="font-semibold text-foreground" />
            </div>
            {result.belowMin && (
              <div className="flex gap-2 rounded-xl bg-alert-soft px-3 py-2.5 text-xs text-alert">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Resultado abaixo da margem mínima
                configurada.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Percentuais deste orçamento</CardTitle>
        </CardHeader>
        <SubmitForm onSubmit={() => setConfirming(true)} className="">
          <CardContent className="space-y-2">
            {PARAM_FIELDS.map(([k, l]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <Label className="text-xs">{l}</Label>
                <Input
                  className="h-8 w-24 text-right num"
                  type="number"
                  step="any"
                  disabled={locked}
                  value={draft[k] as number}
                  onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
                />
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <Label className="text-xs">Desconto geral (R$)</Label>
              <Input
                className="h-8 w-28 text-right num"
                type="number"
                step="0.01"
                disabled={locked}
                value={disc}
                onChange={(e) => setDisc(Number(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O desconto geral é distribuído proporcionalmente entre mão de obra e materiais. Custos
              originais não mudam.
            </p>
            {dirty && !locked && (
              <Button type="submit" className="w-full">
                Revisar alteração
              </Button>
            )}
          </CardContent>
        </SubmitForm>
      </Card>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar alteração de preço</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left"></th>
                <th className="text-right">Antes</th>
                <th className="text-right">Depois</th>
              </tr>
            </thead>
            <tbody className="num">
              {(
                [
                  ["Preço ao cliente", result.saleNet, sim.saleNet],
                  ["Desconto", result.totalDiscount, sim.totalDiscount],
                  ["Comissão", result.commission, sim.commission],
                  ["Resultado", result.result, sim.result],
                ] as const
              ).map(([l, a, b]) => (
                <tr key={l} className="border-t border-border/60">
                  <td className="py-1.5">{l}</td>
                  <td className="text-right">{fmtBRL(a)}</td>
                  <td className="text-right font-semibold">{fmtBRL(b)}</td>
                </tr>
              ))}
              <tr className="border-t border-border/60">
                <td className="py-1.5">Margem</td>
                <td className="text-right">{fmtPct(result.margin)}</td>
                <td className={`text-right font-semibold ${sim.belowMin ? "text-negative" : ""}`}>
                  {fmtPct(sim.margin)}
                </td>
              </tr>
            </tbody>
          </table>
          {sim.belowMin && (
            <div className="flex gap-2 rounded-xl bg-alert-soft px-3 py-2.5 text-sm text-alert">
              <AlertTriangle className="h-4 w-4 shrink-0" /> O novo resultado fica abaixo da margem
              mínima.
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(params);
                setDisc(discount);
                setConfirming(false);
              }}
            >
              Descartar
            </Button>
            <Button onClick={apply}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ l, v, strong, muted }: { l: string; v: number; strong?: boolean; muted?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2",
        strong && "pt-1 text-base font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      <span className="whitespace-pre">{l}</span>
      <Money value={v} tone={strong ? "auto" : "inherit"} />
    </div>
  );
}

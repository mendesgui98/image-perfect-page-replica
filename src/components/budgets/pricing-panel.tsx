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
import { type Item, type Section } from "@/lib/budget-data";
import {
  computeBudget,
  isDirectCostModel,
  laborRatesBase,
  marginLevel,
  costBreakdown,
  priceRates,
  priceSimulation,
  suggestedPrice,
  type BudgetResult,
  type MarginLevel,
  type PricingParams,
} from "@/lib/pricing";
import { maskBRL, moneyText, parseBRL } from "@/lib/money";
import { Switch } from "@/components/ui/switch";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/format";
import { Money } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PanelProps = {
  budgetId: string;
  params: PricingParams;
  discount: number;
  items: Item[];
  sections?: Section[] | undefined;
  result: BudgetResult;
  locked: boolean;
  onApplied: () => void;
};

/** Orçamentos novos usam o preço pelo custo direto; os antigos mantêm o painel por acréscimos. */
export function PricingPanel(props: PanelProps) {
  return isDirectCostModel(props.params) ? (
    <DirectCostPanel {...props} />
  ) : (
    <LegacyPricingPanel {...props} />
  );
}

const PARAM_FIELDS: [keyof PricingParams, string][] = [
  ["labor_markup", "Acréscimo MO (% s/ custo)"],
  ["materials_markup", "Acréscimo mat. (% s/ custo)"],
  ["negotiation_reserve", "Reserva negociação (%)"],
  ["architect_commission", "Comissão arquiteta (% s/ MO)"],
  ["desired_margin", "Margem desejada (% s/ venda)"],
  ["min_margin", "Margem mínima (% s/ venda)"],
  ["reinvestment_share", "Reinvestimento (% do resultado)"],
];

function LegacyPricingPanel({
  budgetId,
  params,
  discount,
  items,
  result,
  locked,
  onApplied,
}: PanelProps) {
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
    <div className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-1 xl:[scrollbar-width:thin]">
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

const LEVEL: Record<MarginLevel, { label: string; badge: string; text: string }> = {
  saudavel: { label: "Saudável", badge: "bg-positive-soft text-positive", text: "text-positive" },
  atencao: { label: "Atenção", badge: "bg-alert-soft text-alert", text: "text-alert" },
  alerta: { label: "Alerta", badge: "bg-negative-soft text-negative", text: "text-negative" },
  prejuizo: {
    label: "Prejuízo",
    badge: "bg-negative text-white",
    text: "text-negative font-bold",
  },
};

const RATE_FIELDS: [keyof PricingParams, string][] = [
  ["structure_rate", "Custo estrutural JMG"],
  ["architect_commission", "RT / comissão do arquiteto"],
  ["tax_rate", "Impostos"],
  ["desired_margin", "Margem de lucro desejada"],
];

/**
 * Formação de preço, negociação e simulador (modelo do custo direto). Toda conta vem de
 * pricing.ts; nada disto aparece no PDF do cliente.
 */
function DirectCostPanel({
  budgetId,
  params,
  items,
  sections = [],
  result,
  locked,
  onApplied,
}: PanelProps) {
  const [draft, setDraft] = useState(params);
  const [priceText, setPriceText] = useState(moneyText(params.negotiated_price ?? null));
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    setDraft(params);
    setPriceText(params.negotiated_price != null ? moneyText(params.negotiated_price) : "");
  }, [params]);
  const sim = useMemo(() => computeBudget(items, draft), [items, draft]);
  const rates = priceRates(draft);
  const target = Number(draft.desired_margin) || 0;
  const min = Number(draft.min_margin) || 0;
  // Materiais que levam só o imposto (percentuais só sobre a mão de obra).
  const onlyTax = laborRatesBase(draft) ? sim.materialsCost : 0;
  const original = costBreakdown(sim.totalCost, rates, onlyTax);
  const level = marginLevel(sim.margin, target, min);
  const dirty = JSON.stringify(draft) !== JSON.stringify(params);
  const negotiated = draft.negotiated_price != null;

  // Custo direto por etapa (mão de obra + materiais), na ordem das etapas.
  const byStage = sections
    .map((sec) => {
      const own = items
        .map((it, i) => ({ it, r: sim.items[i] }))
        .filter((x) => x.it.section_id === sec.id);
      return {
        id: sec.id,
        name: sec.title,
        cost: own.reduce((s, x) => s + (x.r ? x.r.laborCost + x.r.materialsCost : 0), 0),
      };
    })
    .filter((x) => x.cost > 0);

  function setNegotiated(text: string) {
    const masked = maskBRL(text);
    setPriceText(masked);
    setDraft({ ...draft, negotiated_price: masked ? parseBRL(masked) : null });
  }

  async function save() {
    try {
      await budgetApi.update(budgetId, { params: draft as never });
      await budgetApi.logHistory({
        budget_id: budgetId,
        action: "precificacao",
        summary: {
          antes: { params, total: result.saleNet, margem: result.margin },
          depois: { params: draft, total: sim.saleNet, margem: sim.margin },
        } as never,
      });
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    toast.success("Preço salvo.");
    setConfirming(false);
    onApplied();
  }

  return (
    <div className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-1 xl:[scrollbar-width:thin]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Custo direto</CardTitle>
          <p className="text-xs text-muted-foreground">
            Custo real da JMG: mão de obra + materiais. Interno, não vai ao cliente.
          </p>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <Row l="Mão de obra" v={sim.laborCost} />
          <Row l="Materiais" v={sim.materialsCost} />
          <div className="border-t border-border/60 pt-2">
            <Row l="Custo direto total" v={sim.totalCost} strong />
          </div>
          {byStage.length > 0 && (
            <details className="group rounded-lg bg-muted/50 px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-primary [&::-webkit-details-marker]:hidden">
                Ver custo por etapa ({byStage.length})
                <span className="transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-2 space-y-1.5">
                {byStage.map((x) => (
                  <Row key={x.id} l={x.name} v={x.cost} muted />
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <SubmitForm
        onSubmit={() => (sim.belowMin ? setConfirming(true) : void save())}
        className="space-y-4"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Formação de preço</CardTitle>
            <p className="text-xs text-muted-foreground">
              {onlyTax > 0
                ? "Os percentuais são partes do preço da mão de obra; os materiais levam só o imposto."
                : "Os percentuais são partes do preço final, não um acréscimo sobre o custo."}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {RATE_FIELDS.map(([k, l]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <Label htmlFor={`rate-${k}`} className="text-xs">
                  {l}
                </Label>
                <div className="flex items-center gap-2">
                  {k === "architect_commission" && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        aria-label="Aplicar RT"
                        disabled={locked}
                        checked={draft.apply_rt !== false}
                        onCheckedChange={(on) => setDraft({ ...draft, apply_rt: on })}
                      />
                      {draft.apply_rt !== false ? "Sim" : "Não"}
                    </label>
                  )}
                  <div className="relative">
                    <Input
                      id={`rate-${k}`}
                      className="h-9 w-24 pr-6 text-right num"
                      type="number"
                      step="any"
                      min={0}
                      disabled={
                        locked || (k === "architect_commission" && draft.apply_rt === false)
                      }
                      value={(draft[k] as number) ?? 0}
                      onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) || 0 })}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {original === null ? (
              <p className="flex gap-2 rounded-xl bg-negative-soft px-3 py-2.5 text-xs text-negative">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Os percentuais somam 100% ou mais:
                não existe preço possível. Reduza algum deles.
              </p>
            ) : (
              <>
                <div className="rounded-xl bg-primary-soft p-3">
                  <p className="text-xs font-medium text-primary">Preço calculado</p>
                  <p className="text-2xl font-bold tracking-tight">
                    <Money value={original.price} />
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Sugerido (centena):{" "}
                      <Money
                        value={suggestedPrice(original.price)}
                        className="font-semibold text-foreground"
                      />
                    </span>
                    {!locked && (
                      <Button
                        type="button"
                        size="sm"
                        variant="soft"
                        className="h-7"
                        onClick={() => setNegotiated(moneyText(suggestedPrice(original.price)))}
                      >
                        Usar sugerido
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Row l="Custo direto" v={original.directCost} muted />
                  {onlyTax > 0 && (
                    <>
                      <Row l="Materiais com imposto" v={original.materialsPrice} muted />
                      <Row l="Mão de obra (base dos percentuais)" v={original.laborPrice} muted />
                    </>
                  )}
                  <Row
                    l={`Estrutura JMG · ${fmtNum(rates.structure)}%`}
                    v={original.structure}
                    muted
                  />
                  <Row l={`RT · ${fmtNum(rates.rt)}%`} v={original.rt} muted />
                  <Row l={`Impostos · ${fmtNum(rates.taxes)}%`} v={original.taxes} muted />
                  <Row l={`Lucro · ${fmtNum(rates.margin)}%`} v={original.profit} />
                  <Row l="Total" v={original.price} strong />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Negociação</CardTitle>
            <p className="text-xs text-muted-foreground">
              Estrutura, RT e impostos acompanham o preço; o desconto sai do lucro.
              {onlyTax > 0 && " A margem é medida sobre o preço da mão de obra."}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label htmlFor="negotiated-price" className="text-xs">
                Preço proposto ao cliente
              </Label>
              <div className="flex gap-2">
                <Input
                  id="negotiated-price"
                  inputMode="numeric"
                  className="num"
                  placeholder={original ? fmtBRL(original.price) : "R$ 0,00"}
                  disabled={locked}
                  value={priceText}
                  onChange={(e) => setNegotiated(e.target.value)}
                />
                {negotiated && !locked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10"
                    onClick={() => setNegotiated("")}
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {negotiated ? "O PDF usa este preço." : "Vazio: o PDF usa o preço calculado."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Row l="Preço final" v={sim.saleNet} strong />
              <div className="flex items-baseline justify-between gap-2">
                <span>Desconto</span>
                <span className="font-medium num">
                  {fmtBRL(sim.totalDiscount)}
                  {original && original.price > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({fmtPct(sim.totalDiscount / original.price)})
                    </span>
                  )}
                </span>
              </div>
              <Row l="Lucro previsto" v={sim.result} />
            </div>
            <div className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Margem</span>
                <Badge className={cn("border-transparent", LEVEL[level].badge)}>
                  {LEVEL[level].label}
                </Badge>
              </div>
              <p className="mt-1 text-base">
                Inicial <strong className="num">{fmtNum(target)}%</strong> → após negociação{" "}
                <strong className={cn("num", LEVEL[level].text)}>{fmtPct(sim.margin)}</strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Meta {fmtNum(target)}% · mínima {fmtNum(min)}%
              </p>
            </div>
            {dirty && !locked && (
              <Button type="submit" className="w-full" disabled={original === null}>
                Salvar preço
              </Button>
            )}
          </CardContent>
        </Card>
      </SubmitForm>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Simulador de preço</CardTitle>
          <p className="text-xs text-muted-foreground">
            Mesmo custo direto, estrutura, RT e impostos; muda só a margem
            {onlyTax > 0 && " (sobre a mão de obra; materiais só com imposto)"}.
          </p>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Margem</th>
                <th className="py-1 text-right font-medium">Preço</th>
              </tr>
            </thead>
            <tbody>
              {priceSimulation(sim.totalCost, rates, undefined, onlyTax).map((r) => (
                <tr
                  key={r.margin}
                  className={cn(
                    "border-t border-border/60",
                    r.margin === rates.margin && "font-semibold text-primary",
                  )}
                >
                  <td className="py-1.5">{r.margin}%</td>
                  <td className="py-1.5 text-right">
                    {r.price === null ? "—" : <Money value={r.price} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Margem abaixo da mínima</DialogTitle>
          </DialogHeader>
          <p className="flex gap-2 rounded-xl bg-alert-soft px-3 py-2.5 text-sm text-alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Atenção: este preço reduz a margem da obra para {fmtPct(sim.margin)}. A margem mínima
            configurada pela JMG é {fmtNum(min)}%.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
            <Button onClick={save}>Confirmar mesmo assim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

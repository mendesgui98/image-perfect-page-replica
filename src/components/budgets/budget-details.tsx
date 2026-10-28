import { useEffect, useState, type ReactNode } from "react";
import { formatCep } from "@/lib/documents";
import { capitalizeWordsProps } from "@/lib/text-case";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { loadBudget, type Term } from "@/lib/budget-data";
import { splitPayments } from "@/lib/pricing";
import { COMPANY, DEFAULT_NOTES, DEFAULT_TERMS, VALIDITY_DAYS } from "@/lib/proposal";
import { fmtNum } from "@/lib/format";
import { Money, Notice } from "@/components/kpi";

type BudgetRow = NonNullable<Awaited<ReturnType<typeof loadBudget>>>["budget"];

const PROPERTY_TYPES = ["Apartamento", "Casa", "Sala comercial", "Loja", "Cobertura"];

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border/60 pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function DadosEditor({
  budget,
  terms,
  total,
  scheduleWeeks,
  creatorName,
  locked,
  onSave,
}: {
  budget: BudgetRow;
  terms: Term[];
  total: number;
  /** Duração do cronograma do orçamento, usada quando o prazo fica vazio. */
  scheduleWeeks: number;
  creatorName: string;
  locked: boolean;
  onSave: (p: Record<string, unknown>) => Promise<unknown>;
}) {
  const [f, setF] = useState(budget);
  const [t, setT] = useState<Term[]>(terms);
  useEffect(() => {
    setF(budget);
    setT(terms);
  }, [budget, terms]);
  const { rows, pctSum } = splitPayments(total, t);
  const open = Math.abs(pctSum - 100) > 1e-9;
  const submit = () => {
    const {
      client_display,
      title,
      description,
      property_type,
      property_area,
      endereco,
      bairro,
      cidade,
      uf,
      cep,
      validity_date,
      start_date,
      estimated_weeks,
      responsible,
      notes,
    } = f;
    void onSave(
      locked
        ? { client_display }
        : {
            client_display,
            title: title?.trim() || "Proposta de Reforma",
            description: description?.trim() || null,
            property_type: property_type?.trim() || null,
            property_area: property_area ? Number(property_area) : null,
            endereco,
            bairro,
            cidade,
            uf,
            cep,
            validity_date: validity_date || null,
            start_date: start_date || null,
            estimated_weeks: estimated_weeks ? Math.round(Number(estimated_weeks)) : null,
            responsible: responsible?.trim() || null,
            notes,
            payment_terms: t.map((x) => ({
              label: x.label.trim(),
              when: x.when?.trim() ?? "",
              pct: Number(x.pct) || 0,
            })),
          },
    );
  };
  const capitalized = ["client_display", "endereco", "bairro", "cidade", "responsible"];
  const field = (
    k: keyof BudgetRow,
    l: string,
    opts: { type?: string; span?: string; placeholder?: string; hint?: string; list?: string } = {},
  ) => (
    <div className={`space-y-1 ${opts.span ?? ""}`}>
      <Label htmlFor={`budget-${k}`}>{l}</Label>
      <Input
        id={`budget-${k}`}
        type={opts.type ?? "text"}
        disabled={locked}
        list={opts.list}
        placeholder={opts.placeholder}
        value={(f[k] as string | number | null) ?? ""}
        inputMode={k === "cep" ? "numeric" : undefined}
        {...(capitalized.includes(k) ? capitalizeWordsProps : {})}
        onChange={(e) =>
          setF({ ...f, [k]: k === "cep" ? formatCep(e.target.value) : e.target.value })
        }
      />
      {opts.hint && <p className="text-xs text-muted-foreground">{opts.hint}</p>}
    </div>
  );
  return (
    <Card className="shadow-card">
      <SubmitForm onSubmit={submit} className="">
        <CardContent className="space-y-5 p-4 sm:p-6">
          <Group title="Cliente e obra" hint="Aparecem na capa e em “Sobre esta obra” do PDF.">
            <div className="grid gap-3 sm:grid-cols-2">
              {field("client_display", "Nome do cliente no documento", { span: "sm:col-span-2" })}
              {field("title", "Título da obra", {
                span: "sm:col-span-2",
                placeholder: "Ex.: Reforma completa de apartamento",
              })}
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="budget-description">Descrição da obra</Label>
                <Textarea
                  id="budget-description"
                  rows={3}
                  disabled={locked}
                  placeholder="Ex.: Reforma de cozinha, área de serviço e banheiro social, com troca de revestimentos…"
                  value={f.description ?? ""}
                  onChange={(e) => setF({ ...f, description: e.target.value })}
                />
              </div>
              {field("property_type", "Tipo de imóvel", {
                list: "property-types",
                placeholder: "Apartamento",
              })}
              {field("property_area", "Metragem (m²)", { type: "number", placeholder: "78" })}
              <datalist id="property-types">
                {PROPERTY_TYPES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              {field("endereco", "Endereço da obra", {
                span: "sm:col-span-2",
                placeholder: "Rua, número – complemento",
              })}
              {field("bairro", "Bairro")}
              {field("cidade", "Cidade")}
              {field("uf", "UF")}
              {field("cep", "CEP")}
            </div>
          </Group>

          <Group title="Prazos e responsável">
            <div className="grid gap-3 sm:grid-cols-2">
              {field("start_date", "Início previsto", { type: "date" })}
              {field("estimated_weeks", "Prazo estimado (semanas)", {
                type: "number",
                placeholder: scheduleWeeks ? `${scheduleWeeks}` : "",
                hint: scheduleWeeks
                  ? `Vazio = duração do cronograma (${scheduleWeeks} ${scheduleWeeks === 1 ? "semana" : "semanas"}).`
                  : "Vazio = duração do cronograma.",
              })}
              {field("validity_date", "Válido até", {
                type: "date",
                hint: `Vazio = ${VALIDITY_DAYS} dias depois da emissão (data em que o PDF é gerado).`,
              })}
              {field("responsible", "Responsável", {
                placeholder: creatorName || COMPANY.responsible,
                hint: "Vazio = quem criou o orçamento.",
              })}
            </div>
          </Group>

          <Group title="Condições de pagamento" hint="Valor = % × total, calculado em centavos.">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium num ${open ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive"}`}
              >
                Soma: {fmtNum(pctSum)}%
              </span>
              {!locked && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setT(DEFAULT_TERMS.map((x) => ({ ...x })))}
                >
                  <RotateCcw className="h-4 w-4" /> Usar padrão 30/25/25/20
                </Button>
              )}
            </div>
            {open && (
              <Notice tone="negative">
                As parcelas somam {fmtNum(pctSum)}%. O PDF fica bloqueado até a soma fechar 100%.
              </Notice>
            )}
            <div className="space-y-2">
              {t.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 items-center gap-2 rounded-xl bg-muted/40 p-2"
                >
                  <Input
                    aria-label={`Descrição da parcela ${i + 1}`}
                    placeholder="Descrição (ex.: 1ª medição)"
                    className="col-span-12 sm:col-span-6"
                    disabled={locked}
                    value={row.label}
                    onChange={(e) =>
                      setT(t.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                  <Input
                    aria-label={`Quando a parcela ${i + 1} é paga`}
                    placeholder="Quando (ex.: Ao concluir as etapas 1 a 4)"
                    className="col-span-12 sm:col-span-6"
                    disabled={locked}
                    value={row.when ?? ""}
                    onChange={(e) =>
                      setT(t.map((x, j) => (j === i ? { ...x, when: e.target.value } : x)))
                    }
                  />
                  <div className="col-span-5 flex items-center gap-1.5 sm:col-span-3">
                    <Input
                      aria-label={`Percentual da parcela ${i + 1}`}
                      type="number"
                      step="any"
                      disabled={locked}
                      value={row.pct}
                      onChange={(e) =>
                        setT(t.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <div className="col-span-5 text-right text-sm font-medium sm:col-span-8">
                    <Money value={rows[i]?.value ?? 0} />
                  </div>
                  {!locked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 justify-self-end text-muted-foreground hover:text-negative sm:col-span-1"
                      aria-label={`Remover parcela ${i + 1}`}
                      onClick={() => setT(t.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!locked && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setT([...t, { label: "", when: "", pct: 0 }])}
                >
                  <Plus className="h-4 w-4" /> Parcela
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Meios de pagamento no PDF: PIX, transferência bancária ou boleto.
            </p>
          </Group>

          <Group
            title="Observações"
            hint="Uma observação por linha; cada linha vira um item no PDF."
          >
            <Textarea
              aria-label="Observações"
              rows={6}
              disabled={locked}
              value={f.notes ?? DEFAULT_NOTES}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
            {!locked && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setF({ ...f, notes: DEFAULT_NOTES })}
              >
                <RotateCcw className="h-4 w-4" /> Restaurar as 4 observações padrão
              </Button>
            )}
          </Group>

          <div className="flex justify-end border-t border-border/60 pt-5">
            <Button type="submit" disabled={locked} className="w-full sm:w-auto">
              Salvar dados
            </Button>
          </div>
        </CardContent>
      </SubmitForm>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { formatCep } from "@/lib/documents";
import { capitalizeWordsProps } from "@/lib/text-case";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "@/components/enter-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { loadBudget, type Term } from "@/lib/budget-data";
import { splitPayments } from "@/lib/pricing";
import { fmtBRL, fmtNum } from "@/lib/format";

export function DadosEditor({
  budget,
  terms,
  total,
  locked,
  onSave,
}: {
  budget: NonNullable<Awaited<ReturnType<typeof loadBudget>>>["budget"];
  terms: Term[];
  total: number;
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
  const submit = () => {
    if (Math.abs(pctSum - 100) > 1e-9) {
      toast.error("As parcelas precisam somar 100%.");
      return;
    }
    const {
      client_display,
      endereco,
      bairro,
      cidade,
      uf,
      cep,
      validity_date,
      estimated_term,
      notes,
      exclusions,
      closing_text,
    } = f;
    onSave(
      locked
        ? { client_display }
        : {
            client_display,
            endereco,
            bairro,
            cidade,
            uf,
            cep,
            validity_date: validity_date || null,
            estimated_term,
            notes,
            exclusions,
            closing_text,
            payment_terms: t,
          },
    );
  };
  const capitalized = ["client_display", "endereco", "bairro", "cidade"];
  const field = (k: keyof typeof f, l: string, type = "text", span = "") => (
    <div className={`space-y-1 ${span}`}>
      <Label>{l}</Label>
      <Input
        type={type}
        disabled={locked}
        value={(f[k] as string) ?? ""}
        inputMode={k === "cep" ? "numeric" : undefined}
        {...(capitalized.includes(k) ? capitalizeWordsProps : {})}
        onChange={(e) =>
          setF({ ...f, [k]: k === "cep" ? formatCep(e.target.value) : e.target.value })
        }
      />
    </div>
  );
  return (
    <Card className="shadow-card">
      <SubmitForm onSubmit={submit} className="">
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("client_display", "Nome do cliente no documento", "text", "sm:col-span-2")}
            {field("endereco", "Endereço da obra", "text", "sm:col-span-2")}
            {field("bairro", "Bairro")}
            {field("cidade", "Cidade")}
            {field("uf", "UF")}
            {field("cep", "CEP")}
            {field("validity_date", "Validade da proposta", "date")}
            {field("estimated_term", "Prazo estimado")}
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              disabled={locked}
              value={f.notes ?? ""}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Exclusões (não inclusos)</Label>
            <Textarea
              disabled={locked}
              value={f.exclusions ?? ""}
              onChange={(e) => setF({ ...f, exclusions: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Texto de fechamento</Label>
            <Textarea
              rows={4}
              disabled={locked}
              value={f.closing_text ?? ""}
              onChange={(e) => setF({ ...f, closing_text: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Condições de pagamento</h3>
              <span
                className={`text-sm num ${Math.abs(pctSum - 100) > 1e-9 ? "font-semibold text-destructive" : "text-muted-foreground"}`}
              >
                Soma: {fmtNum(pctSum)}%
              </span>
            </div>
            <div className="space-y-2">
              {t.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-6"
                    disabled={locked}
                    value={row.label}
                    onChange={(e) =>
                      setT(t.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    step="any"
                    disabled={locked}
                    value={row.pct}
                    onChange={(e) =>
                      setT(t.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))
                    }
                  />
                  <div className="col-span-3 self-center text-right text-sm num">
                    {fmtBRL(rows[i]?.value)}
                  </div>
                  {!locked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      aria-label="Remover"
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
                  onClick={() => setT([...t, { label: "", pct: 0 }])}
                >
                  <Plus className="h-4 w-4" /> Parcela
                </Button>
              )}
            </div>
          </div>
          <Button type="submit" disabled={locked}>
            Salvar dados
          </Button>
        </CardContent>
      </SubmitForm>
    </Card>
  );
}

/* ---------------- Materiais consolidados ---------------- */

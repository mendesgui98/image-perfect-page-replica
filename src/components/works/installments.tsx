import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { installmentRows } from "@/lib/dashboard-math";
import { fmtBRL } from "@/lib/format";
import { toast } from "sonner";
export function Installments({
  total,
  initial = [],
  name = "installments",
}: {
  total?: number;
  initial?: { amount: number; due_date: string }[];
  name?: string;
}) {
  const [rows, setRows] = useState(initial);
  const [count, setCount] = useState(initial.length || 1);
  const [due, setDue] = useState("");
  const ref = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const restore = () => {
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement) {
        try {
          const restored = JSON.parse(input.value);
          if (Array.isArray(restored)) {
            setRows(restored);
            setCount(restored.length || 1);
          }
        } catch (error) {
          console.warn("Rascunho de parcelas inválido; valores atuais mantidos.", error);
        }
      }
    };
    form.addEventListener("jmg-draft-restored", restore);
    return () => form.removeEventListener("jmg-draft-restored", restore);
  }, [name]);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (form) form.dispatchEvent(new Event("input", { bubbles: true }));
  }, [rows]);
  return (
    <fieldset ref={ref} className="space-y-3 border-t pt-3">
      <legend className="text-sm font-semibold">Parcelas e vencimentos</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Número de parcelas
          <Input
            aria-label="Número de parcelas"
            type="number"
            min={1}
            max={120}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Primeiro vencimento
          <Input
            aria-label="Primeiro vencimento"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={(e) => {
          const form = e.currentTarget.form;
          const amount = total ?? Number(new FormData(form ?? undefined).get("amount"));
          try {
            setRows(installmentRows(amount, count, due));
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      >
        Distribuir parcelas
      </Button>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
          <span className="text-xs">
            {i + 1}/{rows.length}
          </span>
          <Input
            aria-label={`Valor parcela ${i + 1}`}
            type="number"
            min="0.01"
            step="0.01"
            required
            value={r.amount || ""}
            onChange={(e) =>
              setRows(rows.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))
            }
          />
          <Input
            aria-label={`Vencimento parcela ${i + 1}`}
            type="date"
            required
            value={r.due_date}
            onChange={(e) =>
              setRows(rows.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))
            }
          />
        </div>
      ))}
      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Total das parcelas: {fmtBRL(rows.reduce((s, r) => s + r.amount, 0))}
        </p>
      )}
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
    </fieldset>
  );
}

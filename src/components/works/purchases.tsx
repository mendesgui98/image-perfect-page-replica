import { useRecordFocus } from "@/hooks/use-record-focus";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackageCheck, Plus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadWorkBudget, workBase } from "@/lib/work-budget";
import { consolidateMaterials, materialBalance } from "@/lib/operations";
import { fmtBRL, fmtDate, fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Installments } from "./installments";
import { Field, selectClass, Attachment } from "./fields";
import { text, number } from "@/lib/form-values";
import { EmptyState, ListSkeleton, PageSkeleton } from "@/components/feedback";
export function Purchases({ workId, budgetId }: { workId: string; budgetId: string | null }) {
  const qc = useQueryClient();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, { quantity: number; price: number }>>({});
  const { data, error } = useQuery({
    queryKey: ["purchases", workId],
    queryFn: async () => {
      const [b, o, m, p] = await Promise.all([
        loadWorkBudget(workId),
        supabase
          .from("purchase_orders")
          .select("*,purchase_lines(*)")
          .eq("work_id", workId)
          .order("created_at", { ascending: false }),
        supabase.from("material_movements").select("*").eq("work_id", workId),
        supabase
          .from("people")
          .select("id,name")
          .eq("kind", "fornecedor")
          .is("deleted_at", null)
          .eq("active", true),
      ]);
      if (o.error) throw o.error;
      if (m.error) throw m.error;
      const catalog = await supabase.from("materials").select("*").eq("active", true);
      if (catalog.error) throw catalog.error;
      return {
        materials: b.items.length
          ? consolidateMaterials(b.items)
          : (catalog.data ?? []).map((x) => ({
              key: x.id + "|" + x.purchase_unit + "|jmg",
              name: x.name,
              unit: x.purchase_unit,
              side: "jmg",
              needed: 0,
              price: x.price,
            })),
        orders: o.data,
        movements: m.data,
        suppliers: p.data ?? [],
      };
    },
  });
  const selectedRecord = useRecordFocus(data);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["purchases", workId] });
    qc.invalidateQueries({ queryKey: ["finance"] });
    qc.invalidateQueries({ queryKey: ["work-result", workId] });
    qc.invalidateQueries({ queryKey: ["financial-dashboard"] });
  };
  async function create(d: FormData) {
    setBusy(true);
    try {
      const lines =
        data?.materials
          .filter((m) => (selected[m.key]?.quantity ?? 0) > 0)
          .map((m) => ({ ...m, ...selected[m.key] })) ?? [];
      const r = await supabase.rpc("create_installment_purchase", {
        _request_id: requestId,
        _work_id: workId,
        _supplier_id: text(d, "supplier"),
        _description: text(d, "description"),
        _expected_date: text(d, "expected"),
        _rows: JSON.parse(text(d, "installments") || "[]"),
        _lines: lines,
      });
      if (r.error) throw r.error;
      setRequestId(crypto.randomUUID());
      setOpen(false);
      setSelected({});
      refresh();
      toast.success("Pedido e conta a pagar registrados.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function receive(id: string) {
    const v = prompt("Quantidade recebida nesta entrega:");
    if (!v) return;
    const r = await supabase.rpc("receive_purchase", {
      _line_id: id,
      _quantity: Number(v.replace(",", ".")),
    });
    if (r.error) toast.error(r.error.message);
    else {
      refresh();
      toast.success("Recebimento registrado.");
    }
  }
  async function movement(d: FormData) {
    const r = await supabase.from("material_movements").insert({
      work_id: workId,
      material_key: text(d, "material"),
      kind: text(d, "kind"),
      quantity: number(d, "quantity"),
    });
    if (r.error) toast.error(r.error.message);
    else {
      refresh();
      toast.success("Movimentação registrada.");
    }
  }
  if (error) return <p className="text-destructive">{error.message}</p>;
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Materiais e compras</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Pedido
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              {[
                "Material",
                "Fornece",
                "Necessário",
                "Reservado",
                "Pedido pendente",
                "Recebido",
                "Consumido",
                "A comprar",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap p-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.materials.map((m) => {
              const lines = data.orders
                .filter((o) => o.status !== "cancelado")
                .flatMap((o) => o.purchase_lines)
                .filter((l) => l.material_key === m.key);
              const mov = data.movements.filter((x) => x.material_key === m.key);
              const reserved = mov
                  .filter((x) => x.kind === "reserva")
                  .reduce((s, x) => s + x.quantity, 0),
                received =
                  lines.reduce((s, x) => s + x.received, 0) +
                  mov
                    .filter((x) => x.kind === "cliente_recebido")
                    .reduce((s, x) => s + x.quantity, 0),
                ordered = lines.reduce((s, x) => s + x.quantity, 0),
                consumed = mov
                  .filter((x) => x.kind === "consumo")
                  .reduce((s, x) => s + x.quantity, 0);
              const balance = materialBalance(m.needed, reserved, ordered, received, consumed);
              return (
                <tr key={m.key} className="border-b">
                  <td className="p-2 font-medium">
                    {m.name}
                    <span className="block text-xs text-muted-foreground">{m.unit}</span>
                  </td>
                  <td className="p-2">{m.side === "jmg" ? "JMG" : "Cliente"}</td>
                  {[m.needed, reserved, balance.pending, received, consumed, balance.toBuy].map(
                    (n, i) => (
                      <td className="p-2 num" key={i}>
                        {fmtNum(n)}
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!data?.materials.length && (
          <EmptyState compact icon={Package} title="Nenhum material cadastrado" />
        )}
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          movement(new FormData(e.currentTarget));
        }}
      >
        <label className="text-sm">
          Material
          <select name="material" required className={selectClass}>
            {data?.materials.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name} · {m.side === "jmg" ? "JMG" : "Cliente"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Movimentação
          <select name="kind" className={selectClass}>
            <option value="reserva">Estoque reservado</option>
            <option value="consumo">Consumo</option>
            <option value="cliente_recebido">Recebido do cliente</option>
          </select>
        </label>
        <Field name="quantity" label="Quantidade" type="number" required />
        <Button type="submit" variant="outline">
          Registrar
        </Button>
      </form>
      <div className="divide-y">
        {data?.orders.map((o) => (
          <article
            key={o.id}
            id={`record-${o.id}`}
            className={`scroll-mt-6 py-4 ${selectedRecord === o.id ? "border-l-4 border-primary bg-accent/40 pl-3" : ""}`}
          >
            <div className="flex justify-between gap-2">
              <div>
                <h3 className="font-semibold">{o.description}</h3>
                <p className="text-xs text-muted-foreground">
                  {data.suppliers.find((p) => p.id === o.supplier_id)?.name ||
                    "Fornecedor não informado"}{" "}
                  · entrega {fmtDate(o.expected_date)} · {o.status}
                </p>
              </div>
              <Attachment path={o.file_path} />
            </div>
            {o.purchase_lines.map((l) => (
              <div
                key={l.id}
                className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"
              >
                <span>
                  {l.name} · {fmtNum(l.received)} / {fmtNum(l.quantity)} {l.unit} ·{" "}
                  {fmtBRL(l.quantity * l.unit_price)}
                </span>
                {l.received < l.quantity && (
                  <Button size="sm" variant="outline" onClick={() => receive(l.id)}>
                    <PackageCheck className="h-4 w-4" />
                    Receber
                  </Button>
                )}
              </div>
            ))}
          </article>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo pedido</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create(new FormData(e.currentTarget));
            }}
          >
            <Field name="description" label="Descrição" required />
            <label className="text-sm">
              Fornecedor
              <select name="supplier" required className={selectClass}>
                <option value="">Selecionar</option>
                {data?.suppliers.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field name="expected" label="Entrega prevista" type="date" required />
            </div>
            {data?.materials
              .filter((m) => m.side === "jmg")
              .map((m) => (
                <div key={m.key} className="grid grid-cols-[1fr_90px_110px] items-end gap-2">
                  <span className="text-sm">
                    {m.name} ({m.unit})
                  </span>
                  <label className="text-xs">
                    Quantidade
                    <Input
                      aria-label={`Quantidade ${m.name}`}
                      type="number"
                      min="0"
                      step="any"
                      value={selected[m.key]?.quantity ?? 0}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          [m.key]: {
                            quantity: Number(e.target.value),
                            price: selected[m.key]?.price ?? m.price,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="text-xs">
                    Preço unitário
                    <Input
                      aria-label={`Preço ${m.name}`}
                      type="number"
                      min="0"
                      step="any"
                      value={selected[m.key]?.price ?? m.price}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          [m.key]: {
                            quantity: selected[m.key]?.quantity ?? 0,
                            price: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            <Installments
              total={
                data?.materials.reduce(
                  (sum, m) =>
                    sum + (selected[m.key]?.quantity ?? 0) * (selected[m.key]?.price ?? m.price),
                  0,
                ) ?? 0
              }
            />
            <Button type="submit" disabled={busy}>
              Confirmar pedido
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

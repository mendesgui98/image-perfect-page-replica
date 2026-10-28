import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback";
import { panelClass } from "@/lib/surface";
import { cn } from "@/lib/utils";
import { type Item } from "@/lib/budget-data";
import { materialPurchaseQty, materialQty } from "@/lib/pricing";
import { fmtNum } from "@/lib/format";

export function MaterialsSummary({ items }: { items: Item[] }) {
  const map = new Map<
    string,
    { name: string; unit: string; purchase: string; buy: number; qty: number; who: string }
  >();
  for (const it of items)
    for (const m of it.materials) {
      const key = `${m.material_id ?? m.name}|${m.supplied_by}`;
      const cur = map.get(key) ?? {
        name: m.name,
        unit: m.consumption_unit,
        purchase: m.purchase_unit,
        buy: 0,
        qty: 0,
        who: m.supplied_by,
      };
      cur.qty += materialQty(m, it.quantity);
      cur.buy += materialPurchaseQty(m, it.quantity);
      map.set(key, cur);
    }
  const rows = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className={cn(panelClass, "overflow-hidden")}>
      {rows.length === 0 ? (
        <EmptyState compact icon={Package} title="Sem materiais nos itens." />
      ) : (
        <>
          <ul className="divide-y divide-border/60 sm:hidden">
            {rows.map((r) => (
              <li key={r.name + r.who} className="flex items-start gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{r.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground num">
                    {fmtNum(r.qty)} {r.unit} · {Math.ceil(r.buy - 1e-9)} {r.purchase}
                  </p>
                </div>
                <Badge variant={r.who === "jmg" ? "info" : "neutral"} className="shrink-0">
                  {r.who === "jmg" ? "JMG" : "Cliente"}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Material</th>
                  <th className="px-5 py-3 text-right font-medium">Consumo</th>
                  <th className="px-5 py-3 text-right font-medium">Em unid. de compra</th>
                  <th className="px-5 py-3 font-medium">Fornece</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.name + r.who}>
                    <td className="px-5 py-3 font-medium">{r.name}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right num">
                      {fmtNum(r.qty)} {r.unit}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right num">
                      {Math.ceil(r.buy - 1e-9)} {r.purchase}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={r.who === "jmg" ? "info" : "neutral"}>
                        {r.who === "jmg" ? "JMG" : "Cliente"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground sm:px-5">
        Previsão consolidada. Pedidos, recebimentos e saldo a comprar chegam na Etapa 3.
      </p>
    </div>
  );
}

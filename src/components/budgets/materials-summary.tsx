import { Card, CardContent } from "@/components/ui/card";
import { type Item } from "@/lib/budget-data";
import { materialQty } from "@/lib/pricing";
import { fmtNum } from "@/lib/format";

export function MaterialsSummary({ items }: { items: Item[] }) {
  const map = new Map<
    string,
    { name: string; unit: string; purchase: string; conv: number; qty: number; who: string }
  >();
  for (const it of items)
    for (const m of it.materials) {
      const key = `${m.material_id ?? m.name}|${m.supplied_by}`;
      const cur = map.get(key) ?? {
        name: m.name,
        unit: m.consumption_unit,
        purchase: m.purchase_unit,
        conv: m.conversion || 1,
        qty: 0,
        who: m.supplied_by,
      };
      cur.qty += materialQty(m, it.quantity);
      map.set(key, cur);
    }
  const rows = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card className="shadow-card">
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="p-3">Material</th>
              <th className="p-3 text-right">Consumo</th>
              <th className="p-3 text-right">Em unid. de compra</th>
              <th className="p-3">Fornece</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name + r.who} className="border-t">
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-right num">
                  {fmtNum(r.qty)} {r.unit}
                </td>
                <td className="p-3 text-right num">
                  {Math.ceil(r.qty / r.conv - 1e-9)} {r.purchase}
                </td>
                <td className="p-3">{r.who === "jmg" ? "JMG" : "Cliente"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Sem materiais nos itens.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="p-3 text-xs text-muted-foreground">
          Previsão consolidada. Pedidos, recebimentos e saldo a comprar chegam na Etapa 3.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Precificação ---------------- */

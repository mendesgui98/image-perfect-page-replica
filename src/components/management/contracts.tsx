import { RecordDeleteButton, RecordTrash } from "@/components/management/record-deletion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { relationshipOptions } from "@/lib/relationship-data";
import { dashboardOptions } from "@/lib/dashboard-data";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { selectClass, Attachment } from "@/components/works/fields";
import { Button } from "@/components/ui/button";
export function ContractList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const { data, error } = useQuery(relationshipOptions(true));
  const { data: dash } = useQuery(dashboardOptions);
  const rows =
    data?.contracts.filter(
      (c) =>
        !c.deleted_at &&
        (!status || c.status === status) &&
        ((data.works.find((w) => w.id === c.work_id)?.name || "") + " " + c.status)
          .toLowerCase()
          .includes(q.toLowerCase()),
    ) ?? [];
  if (error) return <p className="text-destructive">{error.message}</p>;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <RecordTrash entity="contracts" />
        <Input
          className="sm:max-w-sm"
          aria-label="Buscar contrato"
          placeholder="Buscar contrato por obra"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Status do contrato"
          className={selectClass + " sm:w-52"}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="gerado">Gerado</option>
          <option value="assinado">Assinado</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-y text-xs text-muted-foreground">
            <tr>
              {[
                "Contrato / obra",
                "Cliente",
                "Valor",
                "Data",
                "Status",
                "Documentos",
                "Financeiro",
                "Ações",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const w = data?.works.find((w) => w.id === c.work_id);
              const s = dash?.works.find((s) => s.work.id === c.work_id);
              return (
                <tr key={c.id} className="border-b">
                  <td className="p-3">
                    <Link
                      to="/obras/$id"
                      params={{ id: c.work_id }}
                      search={{ tab: "contrato", record: c.id }}
                      className="font-medium text-primary"
                    >
                      {w?.name || "Obra"}
                    </Link>
                  </td>
                  <td className="p-3">
                    {w?.client_id ? (
                      <Link
                        to="/cadastros/$id"
                        params={{ id: w.client_id }}
                        className="text-primary"
                      >
                        {data?.people.find((p) => p.id === w.client_id)?.name || "Cliente"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 num">{s ? fmtBRL(s.result.sale) : "—"}</td>
                  <td className="whitespace-nowrap p-3">
                    {fmtDate(c.signed_date || c.created_at)}
                  </td>
                  <td className="p-3 text-xs">{c.status}</td>
                  <td className="p-3">
                    <Attachment path={c.signed_path} />
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/obras/$id"
                        params={{ id: c.work_id }}
                        search={{ tab: "financeiro" }}
                      >
                        Ver financeiro da obra
                      </Link>
                    </Button>
                  </td>
                  <td className="p-3">
                    <RecordDeleteButton
                      entity="contracts"
                      id={c.id}
                      name={`Contrato · ${w?.name || "Obra"}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum contrato neste filtro.
          </p>
        )}
      </div>
    </section>
  );
}

import { businessDate } from "@/lib/dashboard-math";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { schedulesOptions, scheduleStatus } from "@/lib/schedule-data";
import { physicalProgress } from "@/lib/work-progress";
import { fmtDate, fmtNum } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/components/works/fields";
const labels: Record<string, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  atrasado: "Atrasado",
  elaboracao: "Em elaboração",
};
export function ScheduleList() {
  const { data } = useSuspenseQuery(schedulesOptions);
  const [q, setQ] = useState(""),
    [client, setClient] = useState(""),
    [work, setWork] = useState(""),
    [status, setStatus] = useState(""),
    [kind, setKind] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const today = businessDate();
  const rows = data.filter(({ header: h, stages }) => {
    const start =
      stages
        .map((s) => s.planned_start)
        .filter((s): s is string => !!s)
        .sort()[0] || h.planned_start;
    const end =
      stages
        .map((s) => s.planned_end)
        .filter((s): s is string => !!s)
        .sort()
        .at(-1) || h.planned_end;
    return (
      (!q ||
        (h.name + " " + h.client_name + " " + h.address).toLowerCase().includes(q.toLowerCase())) &&
      (!client || h.client_name === client) &&
      (!work || h.work_id === work) &&
      (!status || scheduleStatus(stages, today) === status) &&
      ((!kind && !h.is_template) ||
        (kind === "modelo" && h.is_template) ||
        (kind === "avulso" && !h.work_id && !h.is_template) ||
        (kind === "vinculado" && !!h.work_id && !h.is_template) ||
        kind === "todos") &&
      (!from || (!!end && end >= from)) &&
      (!to || (!!start && start <= to))
    );
  });
  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          aria-label="Buscar cronograma"
          placeholder="Buscar projeto, cliente ou local"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Filtrar cliente"
          className={selectClass}
          value={client}
          onChange={(e) => setClient(e.target.value)}
        >
          <option value="">Todos os clientes</option>
          {[...new Set(data.map((d) => d.header.client_name).filter(Boolean))].sort().map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar obra"
          className={selectClass}
          value={work}
          onChange={(e) => setWork(e.target.value)}
        >
          <option value="">Todas as obras</option>
          {data
            .filter((d) => d.header.work_id)
            .map((d) => (
              <option key={d.header.id} value={d.header.work_id ?? ""}>
                {d.header.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filtrar situação"
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todas as situações</option>
          {Object.entries(labels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar tipo"
          className={selectClass}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">Cronogramas</option>
          <option value="avulso">Cronograma avulso</option>
          <option value="vinculado">Vinculado à obra</option>
          <option value="modelo">Modelos de cronograma</option>
          <option value="todos">Todos e modelos</option>
        </select>
        <label className="text-xs text-muted-foreground">
          Período a partir de
          <Input
            aria-label="Período a partir de"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Período até
          <Input
            aria-label="Período até"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{rows.length} cronogramas</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {[
                "Projeto / obra",
                "Cliente",
                "Tipo",
                "Início",
                "Término previsto",
                "Avanço",
                "Situação",
              ].map((l) => (
                <th key={l} className="whitespace-nowrap p-3">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ header: h, stages, initialProgress }) => {
              const state = scheduleStatus(stages, today);
              const start =
                  stages
                    .map((s) => s.planned_start)
                    .filter((s): s is string => !!s)
                    .sort()[0] || h.planned_start,
                end =
                  stages
                    .map((s) => s.planned_end)
                    .filter((s): s is string => !!s)
                    .sort()
                    .at(-1) || h.planned_end;
              const progress = physicalProgress(
                stages.map((s) => ({
                  ...s,
                  weight: "weight" in s ? s.weight : 0,
                  progress: s.progress ?? 0,
                })),
                initialProgress,
              );
              return (
                <tr key={h.id} className="border-b hover:bg-muted/40">
                  <td className="min-w-52 p-3">
                    <Link
                      to="/cronogramas/$id"
                      params={{ id: h.id }}
                      className="font-semibold text-primary"
                    >
                      {h.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{h.address}</p>
                  </td>
                  <td className="p-3">{h.client_name || "—"}</td>
                  <td className="whitespace-nowrap p-3 text-xs">
                    {h.is_template
                      ? "Modelo de cronograma"
                      : h.work_id
                        ? "Vinculado à obra"
                        : "Cronograma avulso"}
                  </td>
                  <td className="whitespace-nowrap p-3">{fmtDate(start)}</td>
                  <td className="whitespace-nowrap p-3">{fmtDate(end)}</td>
                  <td className="min-w-24 p-3 num">
                    {fmtNum(progress)}%
                    <progress
                      value={progress}
                      max="100"
                      className="mt-2 h-1.5 w-full accent-primary"
                    />
                  </td>
                  <td
                    className={`whitespace-nowrap p-3 text-xs ${state === "atrasado" ? "text-destructive" : state === "concluido" ? "text-success" : "text-muted-foreground"}`}
                  >
                    {labels[state]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <p className="py-12 text-center text-muted-foreground">Nenhum cronograma encontrado.</p>
        )}
      </div>
    </section>
  );
}

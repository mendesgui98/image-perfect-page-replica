import { useLayoutEffect, useRef, useState } from "react";
import { COMPANY } from "@/lib/proposal";
import { dataPorExtenso, diaMesCurto } from "@/lib/extenso";
import { fmtBRL, fmtDate } from "@/lib/format";

import { buildScheduleSheets, type ScheduleSheet } from "@/lib/schedule-sheets";

// Cronograma físico-financeiro no modelo JMG: folhas A4 deitadas de 10 semanas cada (a última
// completa com semanas em cinza). Usado pelo PDF da obra (impressão) e pela aba Cronograma; a
// conta das folhas fica no módulo puro schedule-sheets.ts. Estilos em styles.css (.cr-*).

export interface ScheduleSheetsProps {
  title: string;
  client: string | null;
  address: string | null;
  codes: string[];
  revision: string;
  issued: string;
  stages: { id: string; name: string; start: string | null; end: string | null }[];
  payments?: { date: string; label: string; amount: number }[];
  materials?: { id: string; stageId: string | null; description: string; due: string }[];
  onSelect?: ((id: string) => void) | undefined;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const ddmm = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export function ScheduleSheets(p: ScheduleSheetsProps) {
  const built = buildScheduleSheets(p);
  if (!built)
    return (
      <p className="py-5 text-sm text-muted-foreground">Datas previstas ainda não informadas.</p>
    );
  const total = (p.payments ?? []).reduce((n, x) => n + x.amount, 0);
  const n = built.sheets.length;
  const head = (s: ScheduleSheet) => (
    <span className="cr-pills">
      {[...p.codes, p.revision].map((c) => (
        <span key={c}>{c}</span>
      ))}
      <span className="gold">
        Folha {s.index + 1} de {n}
      </span>
    </span>
  );
  return (
    <div className="cr-doc">
      {built.sheets.map((s) => {
        const next = built.sheets[s.index + 1];
        // Altura das linhas: cabe até ~20 etapas numa folha sem quebrar.
        const rowMm = Math.max(4.2, Math.min(6.1, (s.index ? 120 : 98) / (s.rows.length + 1)));
        return (
          <section
            key={s.index}
            className="cr-sheet"
            style={{ ["--cr-row" as string]: `${rowMm}mm` }}
          >
            {s.index === 0 ? (
              <header className="cr-head first">
                <img className="cr-mark" src="/jmg-logo-white.png" alt="" />
                <div className="cr-top">
                  <span className="cr-brand">
                    <img src="/jmg-logo-white.png" alt="JMG" />
                    <i />
                    <b>
                      JMG
                      <br />
                      REFORMAS
                    </b>
                  </span>
                  {head(s)}
                </div>
                <div className="cr-title">
                  <div>
                    <p className="cr-kicker">
                      <span />
                      Cronograma físico-financeiro
                    </p>
                    <h1>
                      Cronograma de <em>execução</em>
                    </h1>
                    <p className="cr-who">
                      {p.client && <b>{p.client}</b>}
                      {p.client && " · "}
                      {p.title}
                      <br />
                      {p.address}
                    </p>
                  </div>
                  <dl className="cr-facts">
                    {[
                      ["Início", fmtDate(built.start)],
                      ["Término previsto", fmtDate(built.end)],
                      ["Duração", `${built.totalWeeks} semanas`],
                      ["Etapas", String(p.stages.length)],
                      ...(total > 0 ? [["Valor", fmtBRL(total)]] : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="cr-stripe">
                  <i />
                  <i />
                </div>
              </header>
            ) : (
              <header className="cr-head">
                <img className="cr-mark" src="/jmg-logo-white.png" alt="" />
                <div className="cr-top">
                  <span className="cr-brand small">
                    <img src="/jmg-logo-white.png" alt="JMG" />
                    <span>
                      <b className="cr-h1">
                        Cronograma de <em>execução</em>
                      </b>
                      <small>
                        {p.client && <b>{p.client}</b>}
                        {p.client && " · "}
                        {p.title}
                      </small>
                    </span>
                  </span>
                  {head(s)}
                </div>
                <div className="cr-stripe">
                  <i />
                  <i />
                </div>
              </header>
            )}

            <div className="cr-body">
              <div className="cr-legend">
                <span>
                  <i className="bar" />
                  Execução
                </span>
                <span>
                  <i className="cont" />
                  Continua na folha seguinte/anterior
                </span>
                <span>
                  <i className="pay" />
                  Pagamento
                </span>
                <span>
                  <i className="mat" />
                  Material do cliente na obra
                </span>
                <span className="cr-period">
                  <b>
                    Período S{s.firstWeek} a S{s.lastWeek} · {fmtDate(s.from)} a {fmtDate(s.to)}
                  </b>{" "}
                  · {built.totalWeeks} semanas no total
                </span>
              </div>

              <div className="cr-tablewrap">
                <table className="cr-table">
                  <colgroup>
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "5.5%" }} />
                    <col style={{ width: "6.5%" }} />
                    <col style={{ width: "5%" }} />
                    {s.weeks.map((w) => (
                      <col key={w.label} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="months">
                      <th colSpan={4} className="prev">
                        {s.index > 0 && `◀ continua da folha ${s.index}`}
                      </th>
                      {s.months.map((m) => (
                        <th key={m.label} colSpan={m.span}>
                          {m.label}
                        </th>
                      ))}
                      {s.realWeeks < 10 && <th colSpan={10 - s.realWeeks} className="filler" />}
                    </tr>
                    <tr>
                      <th className="lbl">ETAPA</th>
                      <th>INÍCIO</th>
                      <th>TÉRMINO</th>
                      <th>DUR.</th>
                      {s.weeks.map((w) =>
                        w.filler ? (
                          <th key={w.label} className="filler" />
                        ) : (
                          <th key={w.label}>
                            {w.label}
                            <small>{diaMesCurto(w.date)}</small>
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r, i) => (
                      <tr key={r.id} className={i % 2 ? "alt" : ""}>
                        <td className="name">
                          <span className={`cr-num ${r.number % 2 ? "" : "light"}`}>
                            {pad2(r.number)}
                          </span>
                          {p.onSelect ? (
                            <button type="button" onClick={() => p.onSelect?.(r.id)}>
                              {r.name}
                            </button>
                          ) : (
                            <b>{r.name}</b>
                          )}
                        </td>
                        <td className="c">{ddmm(r.start)}</td>
                        <td className="c">{ddmm(r.end)}</td>
                        <td className="c">{r.weeks ? `${r.weeks} sem.` : "—"}</td>
                        <td className="track" colSpan={10}>
                          <div className="cr-grid" />
                          {s.realWeeks < 10 && (
                            <div className="cr-fill" style={{ left: `${s.realWeeks * 10}%` }} />
                          )}
                          {r.cell.kind === "bar" && (
                            <span
                              className={`cr-bar${r.cell.left ? " left" : ""}${r.cell.right ? " right" : ""}`}
                              style={{
                                left: `calc(${r.cell.from * 10}% + 0.6mm)`,
                                width: `calc(${(r.cell.to - r.cell.from + 1) * 10}% - 1.2mm)`,
                              }}
                            >
                              {r.cell.to - r.cell.from + 1 >= 2 || !r.cell.right
                                ? r.cell.left && r.cell.to - r.cell.from < 1
                                  ? ""
                                  : r.cell.label
                                : ""}
                            </span>
                          )}
                          {r.cell.kind === "done" && (
                            <span className="cr-done">✓ {r.cell.label}</span>
                          )}
                          {r.cell.kind === "future" && (
                            <span
                              className="cr-future"
                              style={{ right: `calc(${(10 - s.realWeeks) * 10}% + 1.5mm)` }}
                            >
                              {r.cell.label} →
                            </span>
                          )}
                          {r.materials.map((at, k) => (
                            <i
                              key={k}
                              className="cr-mat"
                              style={{ left: `calc(${at}% - 3.2mm)` }}
                              title="Material do cliente na obra"
                            />
                          ))}
                        </td>
                      </tr>
                    ))}
                    <tr className="cr-milestones">
                      <td className="name">
                        <span className="cr-num green">R$</span>
                        <b>Marcos de pagamento</b>
                      </td>
                      <td />
                      <td />
                      <td />
                      <td className="track" colSpan={10}>
                        <div className="cr-grid" />
                        {s.realWeeks < 10 && (
                          <div className="cr-fill" style={{ left: `${s.realWeeks * 10}%` }} />
                        )}
                        {s.payments.map((x, k) => (
                          <span
                            key={k}
                            className="cr-pay"
                            style={{
                              left: `calc(${Math.min(9, Math.floor(x.at / 10)) * 10}% + 1mm)`,
                            }}
                          >
                            <i />
                            {pct(x.pct)}
                          </span>
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {s.index === n - 1 && s.realWeeks < 10 && (
                  // Sobre as semanas em cinza: as 4 primeiras colunas ocupam 43% da tabela.
                  <div
                    className="cr-finished"
                    style={{
                      left: `${43 + 5.7 * s.realWeeks}%`,
                      width: `${5.7 * (10 - s.realWeeks)}%`,
                    }}
                  >
                    <b>✓ Obra concluída</b>
                    <span>{fmtDate(built.end)}</span>
                  </div>
                )}
              </div>

              <div className="cr-cards">
                <div>
                  <h3>
                    <i className="pay" />
                    Pagamentos neste período
                  </h3>
                  {s.payments.length ? (
                    s.payments.map((x, k) => (
                      <p key={k} className="row">
                        <b className="blue">{pct(x.pct)}</b>
                        <span>
                          {x.label} <small>previsto {fmtDate(x.date)}</small>
                        </span>
                        <b>{fmtBRL(x.amount)}</b>
                      </p>
                    ))
                  ) : (
                    <p className="empty">Nenhum pagamento previsto neste período.</p>
                  )}
                </div>
                <div>
                  <h3>
                    <i className="mat" />
                    Materiais do cliente neste período
                  </h3>
                  {s.materials.length ? (
                    s.materials.map((m, k) => (
                      <p key={k} className="row">
                        <b className="blue">{m.stage ? pad2(m.stage) : "—"}</b>
                        <span>{m.description}</span>
                        <b>até {fmtDate(m.due)}</b>
                      </p>
                    ))
                  ) : (
                    <p className="empty">Nenhuma entrega de material prevista neste período.</p>
                  )}
                </div>
              </div>

              <p className={`cr-next${next ? "" : " end"}`}>
                {next
                  ? `Continua na folha ${next.index + 1} · S${next.firstWeek} a S${next.lastWeek} · ${fmtDate(next.from)} a ${fmtDate(next.to)} ▶`
                  : `Fim do cronograma · entrega prevista em ${dataPorExtenso(built.end)}`}
              </p>
            </div>

            <footer className="cr-foot">
              <span>
                <img src="/jmg-logo-white.png" alt="JMG" />
                <b>{COMPANY.name}</b> · CNPJ {COMPANY.cnpj} · {COMPANY.phone} · {COMPANY.instagram}
              </span>
              <span>
                {[...p.codes.slice(0, 1), p.revision, `emitido em ${fmtDate(p.issued)}`].join(
                  " · ",
                )}{" "}
                ·{" "}
                <b>
                  FOLHA {s.index + 1} / {n}
                </b>
              </span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}

/** Mostra as folhas (297 mm) reduzidas para caber na largura da tela, sem afetar a impressão. */
export function ScaledSheets(p: ScheduleSheetsProps) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, height: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    const doc = inner.current;
    if (!el || !doc) return;
    const update = () => {
      const scale = Math.min(1, el.clientWidth / doc.offsetWidth);
      setView({ scale, height: doc.offsetHeight * scale });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(doc);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="cr-scaled" style={{ height: view.height || undefined }}>
      <div
        ref={inner}
        style={{ width: "297mm", transform: `scale(${view.scale})`, transformOrigin: "top left" }}
      >
        <ScheduleSheets {...p} />
      </div>
    </div>
  );
}

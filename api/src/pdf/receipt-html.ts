import { formatCpfCnpj } from "../../../src/lib/documents.ts";
import type { ReceiptData } from "../../../src/lib/receipt.ts";
import type { Assets } from "./assets.ts";
import {
  BLUE,
  GOLD,
  NAVY,
  baseCss,
  dmy,
  esc,
  footerHtml,
  htmlOpen,
  icons,
  money,
  num,
} from "./layout.ts";

// Recibo de pagamento (modelo "Recibo-JMG-modelo"): cabeçalho azul-marinho com os dados do
// pagamento, valor recebido por extenso, parcela, quem pagou e quem recebeu, situação financeira do
// contrato até esta data e a faixa da empresa. Uma página contínua como o orçamento e o contrato.

const css = `
.rhead { position: relative; overflow: hidden; background: ${NAVY}; color: #fff; padding: 14mm 16mm 0; }
.rhead .mark { position: absolute; right: -40mm; top: -18mm; width: 150mm; opacity: .07; }
.rhead .top { display: flex; justify-content: space-between; align-items: center; }
.rhead .brand { display: flex; align-items: center; gap: 4.5mm; }
.rhead .brand img { width: 28mm; }
.rhead .brand .sep { width: 1px; height: 10mm; background: rgba(255,255,255,.45); }
.rhead .brand .name { font-weight: 700; letter-spacing: .32em; font-size: 9pt; line-height: 1.6; }
.rhead .code { border: 1px solid rgba(255,255,255,.4); border-radius: 99px; padding: 1.1mm 3.4mm; font-size: 7.5pt;
  letter-spacing: .16em; color: rgba(255,255,255,.85); }
.rhead .kicker { margin-top: 13mm; text-transform: uppercase; display: flex; align-items: center; gap: 3mm; color: ${GOLD};
  font-weight: 600; letter-spacing: .22em; font-size: 8pt; }
.rhead .kicker span { width: 7mm; height: 1px; background: rgba(255,255,255,.5); display: inline-block; }
.rhead h1 { margin: 3mm 0 0; font-size: 30pt; line-height: 1.1; font-weight: 700; letter-spacing: -.02em; }
.rhead h1 em { font-style: normal; color: ${GOLD}; }
.rhead .facts { margin-top: 9mm; border-top: 1px solid rgba(255,255,255,.2); padding: 5.5mm 0 8mm; display: grid;
  grid-template-columns: repeat(4, 1fr); gap: 4mm; }
.rhead .lbl { font-size: 6.6pt; letter-spacing: .16em; color: rgba(255,255,255,.6); font-weight: 600; text-transform: uppercase; }
.rhead .val { font-size: 10.5pt; font-weight: 700; margin-top: .8mm; }
.rhead .stripe { margin: 0 -16mm; }
.rbody { padding: 10mm 16mm 0; }
.hero { display: grid; grid-template-columns: 1.3fr 1fr; gap: 5mm; }
.amount { background: #EAF1FB; border: 1px solid #C9DAF3; border-radius: 3mm; padding: 5mm 6mm; }
.amount span, .refer span, .kpi span, .note span { display: block; font-size: 6.6pt; letter-spacing: .16em; font-weight: 700;
  text-transform: uppercase; }
.amount span { color: ${BLUE}; }
.amount b { display: block; font-size: 25pt; line-height: 1.15; margin-top: 1mm; color: #16233F; letter-spacing: -.02em; }
.amount i { display: block; margin-top: 1.5mm; font-size: 8pt; color: #5B6472; }
.refer { border: 1px solid #E3E6EA; border-radius: 3mm; padding: 5mm 5.5mm; }
.refer span { color: #5B6472; }
.refer b { display: block; font-size: 13pt; margin-top: 1.5mm; color: #16233F; }
.refer small { display: block; color: #5B6472; font-size: 8pt; margin-top: .6mm; }
.pill { display: inline-block; margin-top: 2.4mm; background: #1FA37A; color: #fff; border-radius: 99px; padding: .6mm 2.6mm;
  font-size: 7pt; font-weight: 700; }
.text { margin: 8mm 0 0; font-size: 9.8pt; line-height: 1.85; color: #1B2539; }
.parts { display: grid; grid-template-columns: 1fr 1fr; gap: 4.5mm; margin-top: 10mm; }
.box { border: 1px solid #E3E6EA; border-radius: 3mm; padding: 4.5mm 5mm; font-size: 8.4pt; }
.box h4 { margin: 0 0 3mm; font-size: 9.4pt; color: #16233F; display: flex; align-items: center; gap: 2mm; }
.box h4 i { width: 2mm; height: 2mm; border-radius: 99px; display: inline-block; }
.box dl { margin: 0; display: grid; grid-template-columns: 30mm 1fr; row-gap: 1.6mm; }
.box dt { color: #5B6472; } .box dd { margin: 0; font-weight: 600; color: #16233F; }
.box.wide { margin-top: 4.5mm; } .box.wide dl { grid-template-columns: 34mm 1fr; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; }
.fin { margin-top: 8mm; background: #F4F5F7; border-radius: 3mm; padding: 5mm 5.5mm; }
.fin .t { display: flex; justify-content: space-between; align-items: baseline; }
.fin .t b { font-size: 10.5pt; color: #16233F; } .fin .t small { font-size: 7.6pt; color: #5B6472; }
.bar { height: 2mm; border-radius: 99px; background: #DCE1E8; margin-top: 4mm; overflow: hidden; }
.bar i { display: block; height: 100%; background: #1FA37A; }
.kpis3 { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 3mm; }
.kpi span { color: #5B6472; font-weight: 600; } .kpi b { display: block; font-size: 13pt; color: #16233F; margin-top: .4mm; }
.kpi.ok b { color: #1FA37A; }
.fin table { margin-top: 4mm; background: #fff; border-radius: 2.5mm; overflow: hidden; font-size: 8.2pt; }
.fin th { padding: 2.4mm 4mm; border-bottom: 1px solid #E3E6EA; }
.fin td { padding: 2.6mm 4mm; border-top: 1px solid #EEF0F3; vertical-align: middle; }
.fin td small { display: block; color: #6B7280; font-size: 7pt; }
.fin tr.me td { background: #EAF1FB; font-weight: 700; }
.st { display: inline-block; border-radius: 99px; padding: .5mm 2.4mm; font-size: 6.8pt; font-weight: 700; white-space: nowrap; }
.st.paga { background: #DDF3EA; color: #137A59; } .st.este { background: ${BLUE}; color: #fff; }
.st.receber, .st.parcial { background: #ECEEF1; color: #5B6472; }
.st svg { width: 2.4mm; height: 2.4mm; vertical-align: -.3mm; margin-right: .6mm; stroke: #137A59; }
.end { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 10mm; align-items: end; }
.note { background: #F4F5F7; border-radius: 3mm; padding: 4mm 5mm; font-size: 7.8pt; color: #5B6472; line-height: 1.6; }
.note span { color: #5B6472; font-weight: 500; letter-spacing: 0; text-transform: none; font-size: 7.6pt; }
.note b { display: block; color: #16233F; font-size: 9.4pt; margin: .4mm 0 .8mm; }
.sign { border-top: 1px solid #16233F; padding-top: 2.4mm; font-size: 7.8pt; color: #5B6472; }
.sign b { display: block; color: #16233F; font-size: 9pt; }
`;

const STATE: Record<ReceiptData["rows"][number]["state"], string> = {
  paga: `${icons.check.replace('stroke="#fff"', "")}Paga`,
  este: "Este recibo",
  parcial: "Parcial",
  receber: "A receber",
};

const dl = (rows: { label: string; value: string }[], mono?: string) =>
  `<dl>${rows.map((r) => `<dt>${esc(r.label)}</dt><dd${r.label === mono ? ` class="mono"` : ""}>${esc(r.value)}</dd>`).join("")}</dl>`;

export function receiptHtml(d: ReceiptData, assets: Assets) {
  const c = d.company;
  const doc = d.client.document ? formatCpfCnpj(d.client.document) : "";
  const paidBy = d.paidBy.map((r) =>
    r.label === "CPF/CNPJ" ? { ...r, value: formatCpfCnpj(r.value) || r.value } : r,
  );
  const extra = [
    ...(d.transactionId ? [{ label: "ID da transação", value: d.transactionId }] : []),
    ...(d.work
      ? [{ label: "Obra", value: [d.work.name, d.work.address].filter(Boolean).join(" · ") }]
      : []),
  ];
  const facts = [
    { label: "Data do pagamento", value: dmy(d.paidDate) },
    { label: "Forma", value: d.method },
    { label: "Contrato", value: d.contractCode ?? "—" },
    { label: "Orçamento", value: d.budgetCode ?? "—" },
  ];
  const s = d.summary;
  return `${htmlOpen("continuo")}<head><meta charset="utf-8"><title>${esc(d.number)}</title>
<style>${baseCss(assets, "continuo")}${css}</style></head><body>
<header class="rhead">
  <img class="mark" src="${assets.logoWhite}" alt="">
  <div class="top">
    <div class="brand"><img src="${assets.logoWhite}" alt="JMG"><div class="sep"></div><div class="name">JMG<br>REFORMAS</div></div>
    <div class="code">${esc(d.number)}</div>
  </div>
  <div class="kicker"><span></span>Comprovante de recebimento</div>
  <h1>Recibo de <em>pagamento</em></h1>
  <div class="facts">${facts.map((f) => `<div><div class="lbl">${esc(f.label)}</div><div class="val">${esc(f.value)}</div></div>`).join("")}</div>
  <div class="stripe"><i></i><i></i></div>
</header>
<main class="rbody">
  <div class="hero">
    <div class="amount"><span>Valor recebido</span><b>${money(d.amount)}</b><i>(${esc(d.amountWords)})</i></div>
    <div class="refer"><span>Referente a</span><b>${esc(d.ref.label)}</b>${d.ref.when ? `<small>${esc(d.ref.when)}</small>` : ""}
      ${d.hasContract && d.ref.pct ? `<div class="pill">${num(d.ref.pct)}% do contrato</div>` : ""}</div>
  </div>
  <p class="text">Recebemos de <b>${esc(d.client.name)}</b>${doc ? `, CPF/CNPJ ${esc(doc)}` : ""}, a importância de <b>${money(d.amount)}</b>
  (${esc(d.amountWords)}), referente à <b>${esc(d.ref.label)}</b>${
    d.work
      ? ` da obra <b>${esc(d.work.name.toLowerCase())}</b>${d.work.address ? ` localizada em ${esc(d.work.address)}` : ""}`
      : ""
  }${d.contractCode ? `, conforme o Contrato nº ${esc(d.contractCode)}` : ""}, pelo que damos plena quitação ${d.hasContract ? "desta parcela" : "deste valor"}.</p>
  <div class="parts">
    <div class="box"><h4><i style="background:${GOLD}"></i>Pago por</h4>${dl(paidBy)}</div>
    <div class="box"><h4><i style="background:${BLUE}"></i>Recebido em</h4>${dl(d.receivedIn)}</div>
  </div>
  ${extra.length ? `<div class="box wide">${dl(extra, "ID da transação")}</div>` : ""}
  ${
    d.hasContract
      ? `<section class="fin">
    <div class="t"><b>Situação financeira do contrato</b><small>atualizada em ${dmy(d.paidDate)}</small></div>
    <div class="bar"><i style="width:${s.paidPct}%"></i></div>
    <div class="kpis3">
      <div class="kpi"><span>Valor do contrato</span><b>${money(s.contract)}</b></div>
      <div class="kpi ok"><span>Total pago</span><b>${money(s.paid)}</b></div>
      <div class="kpi"><span>Saldo a pagar</span><b>${money(s.balance)}</b></div>
    </div>
    <table><thead><tr><th>%</th><th>Parcela</th><th class="r">Valor</th><th class="c">Pago em</th><th class="r">Situação</th></tr></thead>
    <tbody>${d.rows
      .map(
        (r) =>
          `<tr${r.state === "este" ? ` class="me"` : ""}><td>${num(r.pct)}%</td><td>${esc(r.label)}${
            r.when ? `<small>${esc(r.when)}</small>` : ""
          }</td><td class="r nb">${money(r.amount)}</td><td class="c">${r.paidDate ? dmy(r.paidDate) : "—"}</td><td class="r"><span class="st ${r.state}">${STATE[r.state]}</span></td></tr>`,
      )
      .join("")}</tbody></table>
  </section>`
      : ""
  }
  <div class="end">
    <div class="note"><span>Recibo nº</span><b>${esc(d.number)}</b>emitido em ${dmy(d.issued)} por ${esc(d.issuer)}.<br>
      Este documento comprova apenas o valor e a parcela aqui descritos.</div>
    <div class="sign"><b>${esc(c.name)}</b>${esc(c.responsible)} · CNPJ ${esc(c.cnpj)}</div>
  </div>
</main>
${footerHtml(assets, c)}
</body></html>`;
}

import { dataPorExtenso, numeroPorExtenso } from "../../../src/lib/extenso.ts";
import { renderClauses, type ContractClause } from "../../../src/lib/contract-clauses.ts";
import type { ProposalData } from "../../../src/lib/proposal.ts";
import type { Assets } from "./assets.ts";
import {
  BLUE,
  NAVY,
  baseCss,
  coverHtml,
  dmy,
  esc,
  eyebrow,
  footerHtml,
  money,
  pad2,
  pct,
  stageColor,
} from "./layout.ts";

// Contrato de prestação de serviços no visual do orçamento, também numa página contínua. As cláusulas vêm do modelo editável
// (contract_clauses, carregado com o contrato antigo da JMG) e recebem os dados do orçamento
// aprovado pelos marcadores de contract-clauses.ts (partes, endereço, escopo, valor por extenso,
// parcelas, prazo e início).

const css = `
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 7mm; }
.party { background: #F4F5F7; border-radius: 3mm; padding: 5mm 5mm; font-size: 9.6pt; line-height: 1.6; color: #3E4757; }
.party .lbl { font-size: 7.4pt; letter-spacing: .14em; color: ${BLUE}; font-weight: 700; text-transform: uppercase; }
.party b { display: block; color: #16233F; font-size: 11pt; margin: 1.5mm 0 1mm; }
.clause { margin-top: 8mm; }
.clause h3 { margin: 0 0 3mm; font-size: 13pt; color: #16233F; }
.clause h3 span { width: 8mm; height: 8mm; border-radius: 2mm; background: ${BLUE}; color: #fff; font-size: 9pt;
  display: inline-flex; align-items: center; justify-content: center; margin-right: 3mm; vertical-align: 1px; }
.clause p { margin: 0 0 2.6mm; text-align: justify; line-height: 1.65; font-size: 10pt; color: #2F3848; }
.clause p.sub { padding-left: 6mm; }
.tbl { margin: 3mm 0 4mm; border: 1px solid #E3E6EA; border-radius: 2.5mm; overflow: hidden; }
.tbl th { background: ${NAVY}; color: #fff; padding: 2.6mm 4mm; letter-spacing: .1em; }
.tbl td { padding: 2.6mm 4mm; border-top: 1px solid #ECEEF1; font-size: 9.6pt; }
.tbl tr.t td { font-weight: 700; background: #F4F5F7; }
.tbl .dot { display: inline-flex; width: 4.6mm; height: 4.6mm; border-radius: 99px; font-size: 6pt; margin-right: 2.5mm; vertical-align: middle; }
.bank { margin: 3mm 0 4mm; background: #EEF4FD; border: 1px solid #C9D9F2; border-radius: 3mm; padding: 4mm 5mm;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; font-size: 9.4pt; }
.bank span { display: block; font-size: 7.2pt; letter-spacing: .12em; color: #6B7280; text-transform: uppercase; }
.bank b { color: #16233F; }
.closing { margin-top: 10mm; }
.closing p { line-height: 1.65; }
.signs { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; margin-top: 32mm; }
.signs div { border-top: 1.5px solid ${NAVY}; padding-top: 3.5mm; font-size: 9pt; color: #5B6472; line-height: 1.5; }
.signs b { display: block; color: #16233F; font-size: 10.5pt; }
`;

export function contractHtml(
  d: ProposalData,
  assets: Assets,
  today: string,
  clauses: ContractClause[],
) {
  const orc = `<b>orçamento <span class="nb">${esc(d.number)}</span> (Anexo 1)</b>`;
  const weeks = d.weeks
    ? `${d.weeks} (${numeroPorExtenso(d.weeks)}) ${d.weeks === 1 ? "semana" : "semanas"}`
    : "a definir no cronograma definitivo";
  const client = d.client;
  const cover = coverHtml(assets, {
    code: d.number,
    kicker: "Contrato",
    title: `Contrato de<br>prestação de <em>serviços</em>`,
    subtitle: d.title,
    chips: [
      d.property,
      d.startDate ? `Início previsto ${dmy(d.startDate)}` : null,
      money(d.totals.total),
    ].filter((x): x is string => !!x),
    client: {
      name: client.name,
      ...(client.document ? { sub: `${client.documentLabel} ${client.document}` } : {}),
    },
    site: d.site,
    facts: [
      { label: "Data", value: dmy(today) },
      { label: "Orçamento", value: d.number },
      { label: "Prazo estimado", value: d.weeks ? `${d.weeks} semanas` : "a definir" },
      { label: "Responsável", value: d.responsible },
    ],
  });
  const parties = `<div class="parties">
  <div class="party"><div class="lbl">Contratante</div><b>${esc(client.name)}</b>
    ${client.rg ? `RG: ${esc(client.rg)}<br>` : ""}${client.document ? `${client.documentLabel}: ${esc(client.document)}<br>` : ""}
    ${client.address.map(esc).join("<br>")}</div>
  <div class="party"><div class="lbl">Contratado</div><b>${esc(d.company.name)}</b>
    CNPJ: ${esc(d.company.cnpj)}<br>${esc(d.company.street)} – Casa<br>${esc(d.company.district)}<br>${esc(d.company.city)}<br>CEP ${esc(d.company.cep)}</div>
</div>`;
  const scope = `<table class="tbl"><thead><tr><th>Etapa</th><th class="r">Início</th><th class="r">Duração</th></tr></thead><tbody>
${d.stages.map((s) => `<tr><td><span class="badge dot" style="background:${stageColor(s.number)}">${pad2(s.number)}</span>${esc(s.title)}</td><td class="r">semana ${s.startWeek}</td><td class="r">${s.weeks} sem.</td></tr>`).join("")}
</tbody></table>`;
  const pay = `<table class="tbl"><thead><tr><th>Etapas</th><th class="r">%</th><th class="r">Valor</th></tr></thead><tbody>
${d.payments.map((r) => `<tr><td><b>${esc(r.label)}</b>${r.when ? ` · ${esc(r.when)}` : ""}</td><td class="r">${pct(r.pct)}</td><td class="r nb">${money(r.value)}</td></tr>`).join("")}
<tr class="t"><td>Total</td><td class="r">100%</td><td class="r nb">${money(d.totals.total)}</td></tr></tbody></table>`;
  const c = d.company;
  const bank = `<div class="bank"><div><span>Favorecido</span><b>${esc(c.name.toUpperCase())}</b></div><div><span>CNPJ / Chave PIX</span><b>${esc(c.pix)}</b></div><div><span>Banco</span><b>${esc(c.bank)}</b></div><div><span>Agência</span><b>${esc(c.agency)}</b></div><div><span>Conta corrente</span><b>${esc(c.account)}</b></div></div>`;
  const blocks = { TABELA_ETAPAS: scope, TABELA_PARCELAS: pay, DADOS_BANCARIOS: bank };
  const clausesHtml = renderClauses(clauses, {
    ORCAMENTO: orc,
    ENDERECO_OBRA: `<b>${esc(d.site.full)}</b>`,
    VALOR: `<b>${money(d.totals.total)} (${esc(d.totals.totalWords)})</b>`,
    INICIO: `<b>${d.startDate ? dmy(d.startDate) : "a definir entre as partes"}</b>`,
    PRAZO: `<b>${weeks}</b>`,
  })
    .map(
      (cl) =>
        `<div class="clause"><h3><span>${cl.number}</span>${esc(cl.title)}</h3>${cl.blocks
          .map((b) =>
            b.kind === "block"
              ? blocks[b.block]
              : `<p${b.kind === "sub" ? ` class="sub"` : ""}>${b.html}</p>`,
          )
          .join("")}</div>`,
    )
    .join("");
  const body = `<section class="sec">
  ${eyebrow("Contrato de prestação de serviços")}
  <h2>Partes e objeto</h2>
  ${parties}
  ${clausesHtml}
  <div class="closing clause">
    <p>E por estarem justas e avençadas, as partes assinam o presente instrumento em 02 vias de igual teor e forma.</p>
    <p>${esc(d.site.city || "São Paulo")}, ${dataPorExtenso(today)}.</p>
    <div class="signs">
      <div><b>${esc(c.name.toUpperCase())}</b>CNPJ: ${esc(c.cnpj)}<br>${esc(d.responsible.toUpperCase())}</div>
      <div><b>${esc(client.name.toUpperCase())}</b>${client.document ? `${client.documentLabel}: ${esc(client.document)}` : ""}</div>
    </div>
  </div>
</section>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Contrato ${esc(d.number)}</title>
<style>${baseCss(assets)}${css}</style></head><body>${cover}${body}${footerHtml(assets, c)}</body></html>`;
}

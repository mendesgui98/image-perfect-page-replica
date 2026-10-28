import type { ProposalData } from "../../../src/lib/proposal.ts";
import { dataPorExtenso } from "../../../src/lib/extenso.ts";
import type { Assets } from "./assets.ts";
import {
  BLUE,
  GOLD,
  NAVY,
  baseCss,
  coverHtml,
  dmy,
  esc,
  eyebrow,
  icons,
  money,
  num,
  pad2,
  pct,
  stageColor,
} from "./layout.ts";

// Orçamento oficial JMG (modelo aprovado): capa, quem somos, etapas, materiais, investimento,
// cronograma e aceite. Mão de obra aparece só no total geral; materiais completos.

// Números de "Quem somos" ainda a confirmar com o Guilherme (vieram como exemplo no modelo).
export const ABOUT_STATS = [
  { value: "+120", label: "obras entregues" },
  { value: "10 anos", label: "de experiência" },
  { value: "100%", label: "obras entregues no prazo" },
];

const ABOUT_FEATURES = [
  ["Equipe própria", "Profissionais treinados e registrados, sem terceirização em cadeia."],
  ["Preço fechado por etapa", "Cada serviço e material detalhado — sem surpresa no meio da obra."],
  [
    "Gestão e fiscalização da obra",
    "Coordenação diária no canteiro, fiscalização técnica e cumprimento das normas de segurança (NRs).",
  ],
  ["Garantia de 1 ano", "Garantia sobre mão de obra executada, com termo de entrega."],
];

const css = `
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-top: 7mm; }
.stat { border-left: 3px solid ${GOLD}; padding: .5mm 0 .5mm 4.5mm; }
.stat b { display: block; font-size: 21pt; line-height: 1.15; font-weight: 700; color: #16233F; letter-spacing: -.01em; }
.stat span { color: #5B6472; font-size: 9.5pt; }
.features { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 7mm; }
.feature { background: #F4F5F7; border-radius: 2.5mm; padding: 4.2mm 4.5mm; display: flex; gap: 3.5mm; }
.feature .tick { width: 6.4mm; height: 6.4mm; flex: none; border-radius: 99px; background: ${BLUE};
  display: flex; align-items: center; justify-content: center; }
.feature .tick svg { width: 3.6mm; }
.feature b { display: block; font-size: 10.5pt; color: #16233F; }
.feature p { margin: 1mm 0 0; color: #5B6472; font-size: 9.2pt; line-height: 1.5; }
.about { margin-top: 10mm; break-inside: avoid; }
.obra { margin-top: 4mm; border: 1px solid #E3E6EA; border-radius: 3mm; padding: 6mm 6mm; display: grid;
  grid-template-columns: 1fr 1fr; gap: 6mm; break-inside: avoid; }
.obra h3 { margin: 0; font-size: 12.5pt; color: #16233F; }
.obra p { margin: 2.5mm 0 0; color: #5B6472; font-size: 10pt; line-height: 1.6; }
.pill { background: #EAF1FC; color: #0B3E8C; border-radius: 99px; padding: 1.3mm 3mm; font-size: 8.2pt; font-weight: 600; }
.steps { list-style: none; margin: 0; padding: 0; }
.steps li { display: flex; align-items: center; gap: 3mm; padding: 1.1mm 0; font-size: 9.8pt; }
.dot { width: 5.4mm; height: 5.4mm; border-radius: 99px; font-size: 7pt; flex: none; }
.stage { border: 1px solid #E3E6EA; border-radius: 3mm; overflow: hidden; margin-top: 6mm; break-inside: avoid; }
.stage-head { background: #F4F5F7; padding: 4.5mm 5mm; display: flex; gap: 4mm; align-items: center; }
.stage-head .num { width: 10mm; height: 10mm; border-radius: 2mm; font-size: 12pt; flex: none; }
.stage-head b { display: block; font-size: 12.5pt; color: #16233F; letter-spacing: -.01em; }
.stage-head div > span { color: #5B6472; font-size: 9pt; }
.stage th, .stage td { padding: 2.6mm 5mm; }
.stage th { border-bottom: 1px solid #E3E6EA; padding-top: 4mm; }
.stage td { border-bottom: 1px solid #ECEEF1; font-size: 9.6pt; }
.stage td.u { color: #5B6472; text-align: center; width: 18mm; }
.stage td.q { text-align: right; width: 18mm; }
.stage tfoot td { color: #8A93A1; font-size: 8.6pt; border-bottom: 0; padding: 3mm 5mm; }
.mat { margin-top: 8mm; }
.mat th, .mat td { padding: 2.6mm 2.5mm; }
.mat th { border-bottom: 1px solid #E3E6EA; }
.mat td { border-bottom: 1px solid #ECEEF1; font-size: 9.6pt; }
.mat td.u { color: #5B6472; text-align: center; }
.mat tbody { break-inside: avoid; }
.mat tr.g td { background: #F4F5F7; border-bottom: 0; font-weight: 600; color: #16233F; padding-top: 3.2mm; padding-bottom: 3.2mm; }
.mat tr.g .dot { display: inline-flex; margin-right: 2.5mm; vertical-align: -1mm; width: 4.6mm; height: 4.6mm; font-size: 6pt; }
.mat tr.sp td { border: 0; padding: 2.4mm 0; }
.mat tr.total td { background: ${NAVY}; color: #fff; font-weight: 700; font-size: 11pt; padding: 4mm 4mm; border: 0; }
.mat tr.total td:first-child { border-radius: 2.5mm 0 0 2.5mm; }
.mat tr.total td:last-child { border-radius: 0 2.5mm 2.5mm 0; border-left: 1px solid rgba(255,255,255,.18); }
.invest { margin-top: 6mm; background: ${NAVY}; color: #fff; border-radius: 3mm; padding: 7.5mm 8mm; display: flex; gap: 8mm;
  align-items: center; position: relative; overflow: hidden; }
.invest::after { content: ""; position: absolute; right: -30mm; top: -25mm; width: 95mm; height: 95mm; border-radius: 50%;
  border: 9mm solid rgba(255,255,255,.06); }
.invest .coin { width: 21mm; height: 21mm; flex: none; border-radius: 99px; border: 1px solid rgba(232,163,61,.55);
  background: rgba(232,163,61,.12); color: ${GOLD}; display: flex; align-items: center; justify-content: center; }
.invest .coin svg { width: 10mm; }
.invest .lbl { color: ${GOLD}; letter-spacing: .2em; font-size: 8.5pt; font-weight: 600; }
.invest .big { font-size: 30pt; font-weight: 700; letter-spacing: -.02em; line-height: 1.15; }
.invest .words { color: rgba(255,255,255,.72); font-style: italic; font-size: 9.8pt; position: relative; z-index: 1; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 4mm; }
.box { border: 1px solid #E3E6EA; border-radius: 3mm; padding: 5mm 4.5mm; }
.box .lbl { font-size: 7.4pt; letter-spacing: .14em; color: #8A93A1; text-transform: uppercase; }
.box .v { font-size: 14pt; font-weight: 600; color: #16233F; margin-top: 1.5mm; }
.bar { height: 1.6mm; border-radius: 99px; background: #F0F2F5; margin-top: 3.5mm; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 99px; }
h4 { margin: 7mm 0 2.5mm; font-size: 11.5pt; color: #16233F; }
.pay { border: 1px solid #E3E6EA; border-radius: 2.5mm; padding: 3mm 5mm; display: flex; align-items: center; gap: 6mm;
  margin-top: 2.4mm; break-inside: avoid; }
.pay .p { width: 20mm; font-size: 15.5pt; font-weight: 600; color: ${BLUE}; }
.pay .t { flex: 1; } .pay .t b { display: block; font-size: 10.5pt; color: #16233F; }
.pay .t span { color: #5B6472; font-size: 9.2pt; }
.pay .v { font-size: 11.5pt; font-weight: 700; color: #16233F; }
.means { margin-top: 4mm; font-size: 10pt; color: #5B6472; } .means b { color: #16233F; }
.notes { margin-top: 5mm; background: #F4F5F7; border-radius: 2.5mm; padding: 5mm 6mm; break-inside: avoid; }
.notes b { font-size: 10.5pt; color: #16233F; }
.notes ul { margin: 2mm 0 0; padding-left: 4.5mm; color: #5B6472; font-size: 9.2pt; line-height: 1.6; }
.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-top: 8mm; }
.kpis > div { border-left: 3px solid ${GOLD}; padding-left: 4.5mm; }
.kpis span { font-size: 7.4pt; letter-spacing: .14em; color: #8A93A1; text-transform: uppercase; }
.kpis b { display: block; white-space: nowrap; font-size: 12.5pt; color: #16233F; margin-top: 1mm; }
.gantt { margin-top: 8mm; border: 1px solid #E3E6EA; border-radius: 3mm; overflow: hidden; table-layout: fixed; }
.gantt th { background: ${NAVY}; color: #fff; text-align: center; letter-spacing: 0; text-transform: none; padding: 2.4mm .5mm;
  font-weight: 700; font-size: 8.5pt; line-height: 1.2; }
.gantt th small { display: block; font-weight: 400; font-size: 6.6pt; color: rgba(255,255,255,.6); }
.gantt th.blank { background: #fff; }
.gantt td { border-top: 1px solid #E3E6EA; height: 11mm; padding: 0; }
.gantt td.w { border-left: 1px solid #E3E6EA; background: #F9FAFB; position: relative; }
.gantt td.name { padding: 1.5mm 3mm; font-size: 9pt; }
.gantt td.name div { display: flex; align-items: center; gap: 2.5mm; line-height: 1.3; }
.gantt td.name .dot { width: 4.6mm; height: 4.6mm; font-size: 6pt; }
.gantt .bar2 { position: absolute; top: 2.6mm; height: 5.6mm; left: 1mm; border-radius: 1.4mm; color: #fff; font-size: 7.4pt;
  font-weight: 700; display: flex; align-items: center; padding-left: 2.4mm; white-space: nowrap; z-index: 2; }
.disclaimer { margin-top: 6mm; border-left: 3px solid ${GOLD}; background: #FFF8EC; border-radius: 0 2.5mm 2.5mm 0;
  padding: 4mm 5mm; color: #5B4A2C; font-size: 9.2pt; line-height: 1.6; break-inside: avoid; }
.valid { margin-top: 7mm; border: 1px solid ${BLUE}; background: #EEF4FD; border-radius: 3mm; padding: 7mm 7mm; display: flex;
  align-items: center; gap: 6mm; }
.valid .clock { width: 15mm; height: 15mm; flex: none; border-radius: 99px; background: #fff; border: 1px solid #D6E3F7;
  color: ${BLUE}; display: flex; align-items: center; justify-content: center; }
.valid .clock svg { width: 7mm; }
.valid .main { flex: 1; } .valid .main small { color: ${BLUE}; font-size: 9.5pt; }
.valid .main b { display: block; font-size: 23pt; color: #16233F; line-height: 1.15; }
.valid .main span { color: #5B6472; font-size: 9.2pt; } .valid .main span strong { color: #16233F; }
.valid .side { border-left: 1px solid #C9D9F2; padding-left: 6mm; }
.valid .side span { font-size: 7.4pt; letter-spacing: .14em; color: #8A93A1; }
.valid .side b { display: block; font-size: 11.5pt; color: #16233F; margin: .5mm 0 3mm; }
.accept { margin-top: 8mm; text-align: justify; line-height: 1.75; font-size: 10.5pt; }
.place { margin-top: 9mm; color: #5B6472; font-size: 10.5pt; }
.place i { display: inline-block; border-bottom: 1px solid #1B2539; height: 4mm; vertical-align: -1mm; }
.signs { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; margin-top: 40mm; }
.signs div { border-top: 1.5px solid ${NAVY}; padding-top: 3.5mm; font-size: 9pt; color: #5B6472; }
.signs b { display: block; color: #16233F; font-size: 10.5pt; }
.company { margin-top: 24mm; border-top: 1px solid #E3E6EA; padding-top: 7mm; display: flex; gap: 5mm; align-items: center;
  font-size: 9pt; color: #5B6472; line-height: 1.6; }
.company img { width: 14mm; } .company b { color: #16233F; }
`;

function stageCard(s: ProposalData["stages"][number]) {
  const rows = s.services
    .map(
      (sv) =>
        `<tr><td>${esc(sv.description)}</td><td class="u">${esc(sv.unit)}</td><td class="q">${num(sv.quantity)}</td></tr>`,
    )
    .join("");
  const mats = s.materialsCount
    ? `${s.materialsCount} ${s.materialsCount === 1 ? "material" : "materiais"} · ver lista consolidada`
    : "sem materiais nesta etapa";
  return `<div class="stage">
  <div class="stage-head"><span class="badge num" style="background:${stageColor(s.number)}">${pad2(s.number)}</span>
    <div><b>${esc(s.title)}</b>${s.description ? `<span>${esc(s.description)}</span>` : ""}</div></div>
  <table><thead><tr><th>Serviço</th><th class="c">Un.</th><th class="r">Qtd.</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td>${s.services.length} ${s.services.length === 1 ? "serviço" : "serviços"} nesta etapa</td><td></td><td class="r nb">${mats}</td></tr></tfoot></table>
</div>`;
}

function materialsTable(p: ProposalData) {
  if (!p.materials.length)
    return `<p class="lead">Este orçamento não inclui materiais fornecidos pela JMG.</p>`;
  const groups = p.materials
    .map(
      (g, i) => `<tbody>
${i ? `<tr class="sp"><td colspan="5"></td></tr>` : ""}
<tr class="g"><td colspan="4"><span class="badge dot" style="background:${stageColor(g.stage)}">${pad2(g.stage)}</span>${esc(g.title)}</td><td class="r nb">${money(g.total)}</td></tr>
${g.lines
  .map(
    (l) =>
      `<tr><td>${esc(l.name)}</td><td class="u">${esc(l.unit)}</td><td class="r">${num(l.quantity)}</td><td class="r nb">${money(l.unitPrice)}</td><td class="r nb">${money(l.total)}</td></tr>`,
  )
  .join("")}
</tbody>`,
    )
    .join("");
  return `<table class="mat"><colgroup><col><col style="width:16mm"><col style="width:16mm"><col style="width:27mm"><col style="width:28mm"></colgroup>
<thead><tr><th>Material</th><th class="c">Un.</th><th class="r">Qtd.</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead>
${groups}
<tbody><tr class="sp"><td colspan="5"></td></tr><tr class="total"><td colspan="4">Total de materiais</td><td class="r nb">${money(p.totals.materials)}</td></tr></tbody>
</table>`;
}

function gantt(p: ProposalData) {
  const n = Math.max(1, p.scheduleWeeks.length);
  const head = p.scheduleWeeks
    .map((w) => `<th>${w.label}${w.date ? `<small>${esc(w.date)}</small>` : ""}</th>`)
    .join("");
  const rows = p.stages
    .map((s) => {
      const cells = Array.from({ length: n }, (_, i) => {
        if (i + 1 !== s.startWeek) return `<td class="w"></td>`;
        const width = `calc(${s.weeks * 100}% + ${s.weeks - 1}px - 2mm)`;
        return `<td class="w"><span class="bar2" style="width:${width};background:${stageColor(s.number)}">${s.weeks} sem.</span></td>`;
      }).join("");
      return `<tr><td class="name"><div><span class="badge dot" style="background:${stageColor(s.number)}">${pad2(s.number)}</span>${esc(s.title)}</div></td>${cells}</tr>`;
    })
    .join("");
  return `<table class="gantt"><colgroup><col style="width:${n > 12 ? 48 : 60}mm">${"<col>".repeat(n)}</colgroup>
<thead><tr><th class="blank"></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function proposalHtml(p: ProposalData, assets: Assets, disclaimer: string) {
  const chips = [
    p.property,
    `${p.stages.length} ${p.stages.length === 1 ? "etapa" : "etapas"}`,
    p.startDate ? `Início previsto ${dmy(p.startDate)}` : null,
  ].filter((x): x is string => !!x);
  const weeksLabel = p.weeks ? `${p.weeks} ${p.weeks === 1 ? "semana" : "semanas"}` : "a definir";
  const laborShare = p.totals.total > 0 ? (p.totals.labor / p.totals.total) * 100 : 0;
  const cover = coverHtml(assets, {
    code: p.number,
    kicker: "Proposta comercial",
    title: `Orçamento<br>de <em>reforma</em>`,
    subtitle: p.title,
    chips,
    client: { name: p.client.name },
    site: p.site,
    facts: [
      { label: "Emissão", value: dmy(p.issueDate) },
      { label: "Válido até", value: dmy(p.validUntil) },
      { label: "Prazo estimado", value: weeksLabel },
      { label: "Responsável", value: p.responsible },
    ],
  });
  const about = `<section class="page">
  ${eyebrow("Quem somos")}
  <h2>Reforma bem feita começa<br>antes da obra.</h2>
  <p class="lead">A JMG Reformas é uma empresa especializada em soluções completas para obras e reformas, unindo qualidade, compromisso e eficiência em cada projeto. Com uma equipe qualificada, atendemos desde pequenas intervenções até grandes obras, sempre prezando pela segurança, pela pontualidade e pelo uso de materiais de alta qualidade.</p>
  <div class="stats">${ABOUT_STATS.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>
  <div class="features">${ABOUT_FEATURES.map(([t, d]) => `<div class="feature"><span class="tick">${icons.check}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join("")}</div>
  <div class="about">${eyebrow("Sobre esta obra")}
  <div class="obra"><div><h3>${esc(p.title)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ""}
    <div class="chips">${[
      ...chips.slice(0, 2),
      weeksLabel !== "a definir" ? weeksLabel : null,
      chips[2],
    ]
      .filter(Boolean)
      .map((c) => `<span class="pill">${esc(c)}</span>`)
      .join("")}</div></div>
    <ul class="steps">${p.stages.map((s) => `<li><span class="badge dot" style="background:${stageColor(s.number)}">${pad2(s.number)}</span>${esc(s.title)}</li>`).join("")}</ul>
  </div></div>
</section>`;
  const scope = `<section class="page">
  ${eyebrow("Escopo detalhado")}
  <h2>Etapas e serviços</h2>
  <p class="lead">Cada etapa lista os serviços que serão executados, com unidade e quantidade. Os materiais de todas as etapas estão consolidados na seção seguinte, e o investimento total é apresentado ao final.</p>
  ${p.stages.map(stageCard).join("")}
</section>`;
  const materials = `<section class="page">
  ${eyebrow("Materiais")}
  <h2>Lista consolidada de materiais</h2>
  <p class="lead">${p.materialsCount} ${p.materialsCount === 1 ? "item previsto" : "itens previstos"} para todas as etapas, com quantidades já considerando perdas de corte quando aplicável.</p>
  ${materialsTable(p)}
</section>`;
  const invest = `<section class="page">
  ${eyebrow("Investimento")}
  <h2>Investimento e forma de pagamento</h2>
  <div class="invest"><span class="coin">${icons.invest}</span><div>
    <div class="lbl">INVESTIMENTO TOTAL DA OBRA</div><div class="big">${money(p.totals.total)}</div>
    <div class="words">(${esc(p.totals.totalWords)})</div></div></div>
  <div class="split">
    <div class="box"><div class="lbl">Mão de obra</div><div class="v">${money(p.totals.labor)}</div><div class="bar"><i style="width:${laborShare.toFixed(1)}%;background:${BLUE}"></i></div></div>
    <div class="box"><div class="lbl">Materiais</div><div class="v">${money(p.totals.materials)}</div><div class="bar"><i style="width:${(100 - laborShare).toFixed(1)}%;background:#2A8C82"></i></div></div>
  </div>
  <h4>Condições de pagamento</h4>
  ${p.payments.map((r) => `<div class="pay"><div class="p">${pct(r.pct)}</div><div class="t"><b>${esc(r.label)}</b>${r.when ? `<span>${esc(r.when)}</span>` : ""}</div><div class="v nb">${money(r.value)}</div></div>`).join("")}
  <div class="means"><b>Meios de pagamento:</b> ${esc(p.paymentMethods)}</div>
  ${p.notes.length ? `<div class="notes"><b>Observações</b><ul>${p.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
</section>`;
  const schedule = `<section class="page">
  ${eyebrow("Cronograma")}
  <h2>Cronograma de execução</h2>
  <p class="lead">Previsão em semanas úteis a partir do início da obra. Etapas sobrepostas são executadas em paralelo por equipes diferentes.</p>
  <div class="kpis"><div><span>Início previsto</span><b>${p.startDate ? dataPorExtenso(p.startDate) : "A definir"}</b></div>
    <div><span>Duração</span><b>${weeksLabel}</b></div>
    <div><span>Término previsto</span><b>${p.endDate ? dataPorExtenso(p.endDate) : "A definir"}</b></div></div>
  ${gantt(p)}
  <div class="disclaimer">${esc(disclaimer).replace(/^Importante:/, "<b>Importante:</b>")}</div>
</section>`;
  const doc = p.client.document ? ` · ${p.client.documentLabel} ${esc(p.client.document)}` : "";
  const acceptance = `<section class="page">
  ${eyebrow("Aprovação")}
  <h2>Validade e aceite da proposta</h2>
  <div class="valid"><span class="clock">${icons.clock}</span>
    <div class="main"><small>Esta proposta é válida por</small><b>${p.validityDays} ${p.validityDays === 1 ? "dia" : "dias"}</b>
      <span>Emitida em ${dmy(p.issueDate)} · vence em <strong>${dataPorExtenso(p.validUntil)}</strong></span></div>
    <div class="side"><span>PROPOSTA</span><b>${esc(p.number)}</b><span>VALOR</span><b>${money(p.totals.total)}</b></div></div>
  <p class="accept">Declaro que li e estou de acordo com o escopo, os valores, as condições de pagamento e o cronograma apresentados nesta proposta, autorizando a <b>JMG Reformas</b> a iniciar a execução da obra no endereço <b>${esc(p.site.full)}</b>. Após a assinatura, será emitido o contrato de prestação de serviços correspondente.</p>
  <div class="place">Local e data: <i style="width:46mm"></i> , <i style="width:12mm"></i> de <i style="width:46mm"></i> de 20<i style="width:9mm"></i></div>
  <div class="signs"><div><b>${esc(p.client.name)}</b>Contratante${doc}</div>
    <div><b>${esc(p.responsible)}</b>Responsável técnico · JMG Reformas</div></div>
  <div class="company"><img src="${assets.logoBlueUri}" alt="JMG"><div><b>${esc(p.company.name)}</b> · CNPJ ${esc(p.company.cnpj)}<br>
    ${esc(p.company.street)} – ${esc(p.company.district)}, ${esc(p.company.city)}, CEP ${esc(p.company.cep)}<br>
    ${esc(p.company.phone)} · ${esc(p.company.instagram)}</div></div>
</section>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(p.number)}</title>
<style>${baseCss(assets)}${css}</style></head><body>${cover}${about}${scope}${materials}${invest}${schedule}${acceptance}</body></html>`;
}

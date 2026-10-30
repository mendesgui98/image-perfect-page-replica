import type { PdfLayout, ProposalData } from "../../../src/lib/proposal.ts";
import { dataPorExtenso } from "../../../src/lib/extenso.ts";
import type { Assets } from "./assets.ts";
import {
  BLUE,
  BLUE_LIGHT,
  GOLD,
  NAVY,
  baseCss,
  coverHtml,
  divider,
  dmy,
  esc,
  eyebrow,
  footerHtml,
  htmlOpen,
  icons,
  money,
  num,
  pad2,
  pct,
  stageColor,
} from "./layout.ts";

// Orçamento oficial JMG (modelo contínuo aprovado): capa, quem somos, etapas e serviços,
// materiais, investimento, cronograma e aceite numa página só, separados por divisórias.
// Mão de obra aparece só como total; materiais completos.

export const ABOUT_STATS = [
  { value: "+120", label: "obras entregues" },
  { value: "+35 anos", label: "de experiência" },
  { value: "100%", label: "de satisfação nas nossas entregas" },
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

const HOW_WE_WORK = [
  ["Visita técnica", "Levantamento das medidas e das necessidades no local da obra."],
  ["Orçamento detalhado", "Serviços por etapa, materiais e condições de pagamento."],
  ["Contrato e cronograma", "Após a aprovação, contrato assinado e cronograma definitivo."],
  ["Execução acompanhada", "Obra coordenada pela nossa equipe, com fiscalização técnica."],
  ["Vistoria e entrega", "Limpeza fina, vistoria final e termo de entrega e garantia."],
];

const css = `
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-top: 8mm; }
.stat { border-left: 2px solid ${GOLD}; padding: .5mm 0 .5mm 3.5mm; }
.stat b { display: block; font-size: 18pt; line-height: 1.2; font-weight: 700; color: #16233F; letter-spacing: -.01em; }
.stat span { color: #5B6472; font-size: 7.8pt; }
.features { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 7mm; }
.feature { background: #F4F5F7; border-radius: 2.5mm; padding: 3.5mm 4mm; display: flex; gap: 3mm; }
.feature .tick { width: 5.4mm; height: 5.4mm; flex: none; border-radius: 99px; background: ${BLUE};
  display: flex; align-items: center; justify-content: center; }
.feature .tick svg { width: 3.2mm; }
.feature b { display: block; font-size: 9.6pt; color: #16233F; }
.feature p { margin: .8mm 0 0; color: #5B6472; font-size: 8pt; line-height: 1.55; }
h3.how { margin: 9mm 0 0; font-size: 12pt; color: #16233F; }
.how-steps { display: grid; grid-template-columns: repeat(5, 1fr); margin-top: 6mm; position: relative; }
.how-steps::before { content: ""; position: absolute; left: 10%; right: 10%; top: 4.6mm; height: .7mm;
  background: linear-gradient(90deg, ${BLUE}, #6B7280 50%, ${GOLD}); }
.how-step { text-align: center; padding: 0 1.5mm; position: relative; }
.how-step .n { width: 9.4mm; height: 9.4mm; margin: 0 auto; border-radius: 99px; background: #fff; border: .6mm solid ${BLUE};
  color: ${BLUE}; font-weight: 700; font-size: 11pt; display: flex; align-items: center; justify-content: center; }
.how-step:last-child .n { background: ${GOLD}; border-color: ${GOLD}; color: #fff; }
.how-step b { display: block; margin-top: 3mm; font-size: 8.8pt; color: #16233F; line-height: 1.25; }
.how-step p { margin: 1.2mm 0 0; color: #5B6472; font-size: 7.4pt; line-height: 1.55; }
.obra { margin-top: 7mm; background: #F4F5F7; border-radius: 3mm; padding: 4.5mm 4.5mm; }
.obra h3 { margin: 2mm 0 0; font-size: 11.5pt; color: #16233F; }
.obra p { margin: 1.5mm 0 0; color: #5B6472; font-size: 9.2pt; line-height: 1.6; }
.pill { background: #E6EEFA; color: #0B3E8C; border-radius: 99px; padding: .9mm 2.6mm; font-size: 7.2pt; font-weight: 600; }
.steps { list-style: none; margin: 4mm 0 0; padding: 3mm 0 0; border-top: 1px solid #E3E6EA;
  display: grid; grid-template-columns: 1fr 1fr; column-gap: 6mm; }
.steps li { display: flex; align-items: center; gap: 2.5mm; padding: .8mm 0; font-size: 8.8pt; }
.dot { width: 4.6mm; height: 4.6mm; border-radius: 99px; font-size: 6pt; flex: none; }
.stage { border: 1px solid #E3E6EA; border-radius: 2.5mm; overflow: hidden; margin-top: 5mm; }
.stage-head { background: #F4F5F7; padding: 2.4mm 3.5mm; display: flex; gap: 3mm; align-items: center; }
.stage-head .num { width: 7mm; height: 7mm; border-radius: 1.5mm; font-size: 9.5pt; flex: none; }
.stage-head b { display: block; font-size: 10.5pt; line-height: 1.3; color: #16233F; letter-spacing: -.01em; }
.stage-head div > span { display: block; color: #5B6472; font-size: 7.8pt; line-height: 1.35; }
.stage table { table-layout: fixed; }
.stage th, .stage td { padding: 1.4mm 3.5mm; }
.stage th { border-bottom: 1px solid #E3E6EA; padding-top: 2.4mm; }
.stage td { border-bottom: 1px solid #ECEEF1; font-size: 8.8pt; }
.stage td.u { text-align: center; }
.stage td.q { text-align: right; }
.stage tfoot td { color: #5B6472; font-size: 7.4pt; border-bottom: 0; padding: 1.8mm 3.5mm; }
.stage .foot { display: flex; justify-content: space-between; gap: 4mm; }
.mat { margin-top: 7mm; }
.mat th, .mat td { padding: 1.4mm 3.5mm; }
.mat th { border-bottom: 1px solid #16233F; }
.mat td { border-bottom: 1px solid #ECEEF1; font-size: 8.8pt; }
.mat td.u { text-align: center; }
.mat td.t { font-weight: 600; color: #16233F; }
.mat tr.g td { background: #F4F5F7; border-bottom: 0; font-weight: 600; color: #16233F; padding-top: 2mm; padding-bottom: 2mm; }
.mat tr.g td:first-child { border-radius: 2mm 0 0 2mm; } .mat tr.g td:last-child { border-radius: 0 2mm 2mm 0; }
.mat tr.g .gt { display: flex; align-items: center; gap: 2mm; }
.mat tr.sp td { border: 0; padding: .9mm 0; }
.invest { margin-top: 6mm; background: ${NAVY}; color: #fff; border-radius: 3mm; padding: 6.5mm 6.5mm; position: relative; overflow: hidden; }
.invest::after { content: ""; position: absolute; right: -22mm; top: -12mm; width: 75mm; height: 75mm; border-radius: 50%;
  border: 6mm solid rgba(255,255,255,.06); }
.invest .lbl { color: ${GOLD}; letter-spacing: .2em; font-size: 7.4pt; font-weight: 600; }
.invest .big { font-size: 29pt; font-weight: 700; letter-spacing: -.02em; line-height: 1.25; margin-top: 1mm; }
.invest .words { color: rgba(255,255,255,.8); font-style: italic; font-size: 8.6pt; position: relative; z-index: 1; }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 4mm; }
.box { border: 1px solid #E3E6EA; border-radius: 2.5mm; padding: 3.6mm 4mm; }
.box .lbl { font-size: 6.6pt; letter-spacing: .14em; color: #5B6472; text-transform: uppercase; }
.box .v { font-size: 14pt; font-weight: 600; color: #16233F; margin-top: .6mm; }
.box small { color: #5B6472; font-size: 7.2pt; }
.bar { height: 1.2mm; border-radius: 99px; background: #E3E6EA; margin: 2.4mm 0 1.6mm; overflow: hidden; }
.bar i { display: block; height: 100%; }
h4 { margin: 7mm 0 1mm; font-size: 11pt; color: #16233F; }
.pay { border: 1px solid #E3E6EA; border-radius: 2.5mm; padding: 2mm 4mm; display: flex; align-items: center; gap: 6mm;
  margin-top: 3mm; }
.pay .p { width: 17mm; font-size: 15pt; font-weight: 600; color: ${BLUE}; }
.pay .t { flex: 1; line-height: 1.35; } .pay .t b { display: block; font-size: 9.6pt; color: #16233F; }
.pay .t span { color: #5B6472; font-size: 7.8pt; }
.pay .v { font-size: 10.5pt; font-weight: 600; color: #3E4757; }
.means { margin-top: 4mm; font-size: 9.6pt; color: #5B6472; } .means b { color: #16233F; }
.notes { margin-top: 7mm; background: #F4F5F7; border-radius: 3mm; padding: 4.5mm 5mm; }
.notes b { font-size: 10.5pt; color: #16233F; }
.notes ol { margin: 2.5mm 0 0; padding-left: 5mm; color: #3E4757; font-size: 8.4pt; line-height: 1.65; }
.notes li { padding-left: 1mm; margin-top: 1.2mm; } .notes li::marker { color: ${BLUE}; font-weight: 700; }
.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-top: 7mm; }
.kpis > div { border-left: 2px solid ${GOLD}; padding-left: 3.5mm; }
.kpis span { font-size: 6.6pt; letter-spacing: .14em; color: #5B6472; text-transform: uppercase; }
.kpis b { display: block; white-space: nowrap; font-size: 11pt; color: #16233F; margin-top: .3mm; }
.gantt { margin-top: 6mm; border: 1px solid #E3E6EA; border-radius: 2.5mm; border-collapse: separate; border-spacing: 0;
  overflow: hidden; table-layout: fixed; }
.gantt th { background: ${NAVY}; color: #fff; text-align: center; letter-spacing: 0; text-transform: none; padding: 2.2mm .5mm;
  font-weight: 700; font-size: 7.8pt; line-height: 1.25; }
.gantt th.lbl { text-align: left; padding-left: 3mm; letter-spacing: .14em; font-size: 6.8pt; }
.gantt th small { display: block; font-weight: 400; font-size: 5.8pt; color: rgba(255,255,255,.7); }
.gantt td { border-top: 1px solid #E3E6EA; height: 11mm; padding: 0; }
.gantt td.w { border-left: 1px solid #E3E6EA; position: relative; }
.gantt tr:nth-child(even) td.w { background: #F9FAFB; }
.gantt td.name { padding: 1.2mm 3mm; font-size: 8.2pt; }
.gantt td.name div { display: flex; align-items: center; gap: 2.5mm; line-height: 1.3; }
.gantt .bar2 { position: absolute; top: 2.6mm; height: 5.2mm; left: .6mm; border-radius: 1.2mm; color: #fff; font-size: 6.6pt;
  font-weight: 700; display: flex; align-items: center; padding-left: 1.8mm; white-space: nowrap; z-index: 2; }
.disclaimer { margin-top: 7mm; color: #5B6472; font-size: 8.2pt; line-height: 1.65; }
.valid { margin-top: 6mm; border: 1px solid ${BLUE}; border-radius: 3mm; padding: 3.6mm 5mm; display: flex;
  align-items: center; gap: 4.5mm; }
.valid .clock { width: 10mm; height: 10mm; flex: none; border-radius: 99px; background: #E6EEFA;
  color: ${BLUE}; display: flex; align-items: center; justify-content: center; }
.valid .clock svg { width: 5mm; }
.valid .main { flex: 1; line-height: 1.35; } .valid .main small { color: #5B6472; font-size: 7.8pt; }
.valid .main b { display: block; font-size: 20pt; color: #16233F; line-height: 1.2; }
.valid .main span { color: #5B6472; font-size: 7.8pt; } .valid .main span strong { color: #3E4757; }
.valid .side { border-left: 1px solid #E3E6EA; padding-left: 4.5mm; text-align: right; line-height: 1.3; }
.valid .side span { font-size: 7.4pt; letter-spacing: .06em; color: #5B6472; }
.valid .side b { display: block; font-size: 10.5pt; color: #16233F; margin: 0 0 1.4mm; }
.valid .side b:last-child { margin-bottom: 0; }
.accept { margin-top: 7mm; line-height: 1.85; font-size: 9.6pt; }
.place { margin-top: 5mm; font-size: 9.6pt; }
.place i { display: inline-block; border-bottom: 1px solid #1B2539; height: 3.6mm; vertical-align: -.6mm; }
.signs { display: grid; grid-template-columns: 1fr 1fr; gap: 15mm; margin-top: 24mm; }
.signs div { border-top: 1px solid ${NAVY}; padding-top: 2.4mm; font-size: 7.6pt; color: #5B6472; }
.signs b { display: block; color: #16233F; font-size: 9.6pt; }
`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function stageCard(s: ProposalData["stages"][number]) {
  const rows = s.services
    .map(
      (sv) =>
        `<tr><td>${esc(sv.description)}</td><td class="u">${esc(sv.unit)}</td><td class="q">${num(sv.quantity)}</td></tr>`,
    )
    .join("");
  const mats = s.materialsCount
    ? `${plural(s.materialsCount, "material", "materiais")} · ver lista consolidada`
    : "sem materiais nesta etapa";
  return `<div class="stage">
  <div class="stage-head"><span class="badge num" style="background:${BLUE}">${pad2(s.number)}</span>
    <div><b>${esc(s.title)}</b>${s.description ? `<span>${esc(s.description)}</span>` : ""}</div></div>
  <table><colgroup><col><col style="width:14mm"><col style="width:14mm"></colgroup><thead><tr><th>Serviço</th><th class="c">Un.</th><th class="r">Qtd.</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="3"><div class="foot"><span>${plural(s.services.length, "serviço", "serviços")} nesta etapa</span><span>${mats}</span></div></td></tr></tfoot></table>
</div>`;
}

function materialsTable(p: ProposalData) {
  if (!p.materials.length)
    return `<p class="lead">Este orçamento não inclui materiais fornecidos pela JMG.</p>`;
  const groups = p.materials
    .map(
      (g, i) => `<tbody>
${i ? `<tr class="sp"><td colspan="5"></td></tr>` : ""}
<tr class="g"><td colspan="4"><div class="gt"><span class="badge dot" style="background:${BLUE}">${pad2(g.stage)}</span>${esc(g.title)}</div></td><td class="r nb">${money(g.total)}</td></tr>
${g.lines
  .map(
    (l) =>
      `<tr><td>${esc(l.name)}</td><td class="u">${esc(l.unit)}</td><td class="r">${num(l.quantity)}</td><td class="r nb">${money(l.unitPrice)}</td><td class="r nb t">${money(l.total)}</td></tr>`,
  )
  .join("")}
</tbody>`,
    )
    .join("");
  return `<table class="mat"><colgroup><col><col style="width:16mm"><col style="width:16mm"><col style="width:28mm"><col style="width:28mm"></colgroup>
<thead><tr><th>Material</th><th class="c">Un.</th><th class="r">Qtd.</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead>
${groups}
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
        const width = `calc(${s.weeks * 100}% + ${s.weeks - 1}px - 1.2mm)`;
        return `<td class="w"><span class="bar2" style="width:${width};background:${BLUE_LIGHT}">${s.weeks} sem.</span></td>`;
      }).join("");
      return `<tr><td class="name"><div><span class="badge dot" style="background:${stageColor(s.number)}">${pad2(s.number)}</span>${esc(s.title)}</div></td>${cells}</tr>`;
    })
    .join("");
  return `<table class="gantt"><colgroup><col style="width:${n > 12 ? 44 : 56}mm">${"<col>".repeat(n)}</colgroup>
<thead><tr><th class="lbl">ETAPA</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

const sumBox = (label: string, value: number, sub: string) =>
  `<div class="sum"><span>${esc(label)}</span><b>${money(value)}</b><small>${esc(sub)}</small></div>`;

export function proposalHtml(
  p: ProposalData,
  assets: Assets,
  disclaimer: string,
  layout: PdfLayout = "continuo",
) {
  const stagesLabel = plural(p.stages.length, "etapa", "etapas");
  const chips = [
    p.property,
    stagesLabel,
    p.startDate ? `Início previsto ${dmy(p.startDate)}` : null,
  ].filter((x): x is string => !!x);
  const weeksLabel = p.weeks ? plural(p.weeks, "semana", "semanas") : "a definir";
  const laborShare = p.totals.total > 0 ? (p.totals.labor / p.totals.total) * 100 : 0;
  const servicesCount = p.stages.reduce((n, s) => n + s.services.length, 0);
  const cover = coverHtml(assets, {
    code: p.number,
    kicker: "Proposta comercial",
    title: `Orçamento<br>de <em>reforma</em>`,
    subtitle: p.title,
    chips,
    card: { client: { name: p.client.name }, site: p.site },
    facts: [
      { label: "Emissão", value: dmy(p.issueDate) },
      { label: "Válido até", value: dmy(p.validUntil) },
      { label: "Prazo estimado", value: weeksLabel },
      { label: "Responsável", value: p.responsible },
    ],
  });
  const about = `<section class="sec">
  ${eyebrow("Quem somos")}
  <h2>Reforma bem feita começa antes da obra.</h2>
  <p class="lead" style="max-width:none">A JMG Reformas é uma empresa especializada em soluções completas para obras e reformas, unindo qualidade, compromisso e eficiência em cada projeto. Com uma equipe qualificada, atendemos desde pequenas intervenções até grandes obras, sempre prezando pela segurança, pela pontualidade e pelo uso de materiais de alta qualidade.</p>
  <div class="stats">${ABOUT_STATS.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>
  <div class="features">${ABOUT_FEATURES.map(([t, d]) => `<div class="feature"><span class="tick">${icons.check}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join("")}</div>
  <h3 class="how">Como trabalhamos</h3>
  <div class="how-steps">${HOW_WE_WORK.map(([t, d], i) => `<div class="how-step"><div class="n">${i + 1}</div><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join("")}</div>
</section>`;
  const scope = `<section class="sec">
  <div class="head"><div>${eyebrow("Escopo detalhado")}
    <h2>Etapas e serviços</h2>
    <p class="lead">Cada etapa lista os serviços que serão executados, com unidade e quantidade. Os materiais estão consolidados na seção seguinte, e o investimento total é apresentado ao final.</p></div>
    ${sumBox("Total dos serviços", p.totals.labor, `${plural(servicesCount, "serviço", "serviços")} · ${stagesLabel}`)}</div>
  <div class="obra">${eyebrow("Sobre esta obra", true)}<h3>${esc(p.title)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ""}
    <div class="chips">${[
      p.property,
      stagesLabel,
      p.weeks ? weeksLabel : null,
      chips.find((c) => c.startsWith("Início")),
    ]
      .filter(Boolean)
      .map((c) => `<span class="pill">${esc(c)}</span>`)
      .join("")}</div>
    <ul class="steps">${p.stages.map((s) => `<li><span class="badge dot" style="background:${stageColor(s.number)}">${pad2(s.number)}</span>${esc(s.title)}</li>`).join("")}</ul>
  </div>
  ${p.stages.map(stageCard).join("")}
</section>`;
  const materials = `<section class="sec">
  <div class="head"><div>${eyebrow("Materiais", true)}
    <h2>Lista consolidada de materiais</h2>
    ${p.materials.length ? `<p class="lead">${plural(p.materialsCount, "item previsto", "itens previstos")} para todas as etapas, com quantidades já considerando perdas de corte quando aplicável.</p>` : ""}</div>
    ${p.materials.length ? sumBox("Total de materiais", p.totals.materials, `${plural(p.materialsCount, "item", "itens")} · ${plural(p.materials.length, "etapa", "etapas")}`) : ""}</div>
  ${materialsTable(p)}
</section>`;
  const invest = `<section class="sec">
  ${eyebrow("Investimento")}
  <h2>Investimento e forma de pagamento</h2>
  <div class="invest"><div class="lbl">INVESTIMENTO TOTAL DA OBRA</div><div class="big">${money(p.totals.total)}</div>
    <div class="words">(${esc(p.totals.totalWords)})</div></div>
  <div class="split">
    <div class="box"><div class="lbl">Mão de obra</div><div class="v">${money(p.totals.labor)}</div><div class="bar"><i style="width:${laborShare.toFixed(1)}%;background:${BLUE}"></i></div><small>${Math.round(laborShare)}% do investimento</small></div>
    <div class="box"><div class="lbl">Materiais</div><div class="v">${money(p.totals.materials)}</div><div class="bar"><i style="width:${(100 - laborShare).toFixed(1)}%;background:#2A9D8F"></i></div><small>${100 - Math.round(laborShare)}% do investimento</small></div>
  </div>
  <h4>Condições de pagamento</h4>
  ${p.payments.map((r) => `<div class="pay"><div class="p">${pct(r.pct)}</div><div class="t"><b>${esc(r.label)}</b>${r.when ? `<span>${esc(r.when)}</span>` : ""}</div><div class="v nb">${money(r.value)}</div></div>`).join("")}
  <div class="means"><b>Meios de pagamento:</b> ${esc(p.paymentMethods)}</div>
  ${p.notes.length ? `<div class="notes"><b>Observações</b><ol>${p.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div>` : ""}
</section>`;
  const schedule = `<section class="sec">
  ${eyebrow("Cronograma", true)}
  <h2>Cronograma de execução</h2>
  <p class="lead" style="max-width:none">Previsão em semanas úteis a partir do início da obra. Etapas sobrepostas são executadas em paralelo por equipes diferentes.</p>
  <div class="kpis"><div><span>Início previsto</span><b>${p.startDate ? dataPorExtenso(p.startDate) : "A definir"}</b></div>
    <div><span>Duração</span><b>${weeksLabel}</b></div>
    <div><span>Término previsto</span><b>${p.endDate ? dataPorExtenso(p.endDate) : "A definir"}</b></div></div>
  ${gantt(p)}
  <p class="disclaimer">${esc(disclaimer)}</p>
</section>`;
  const doc = p.client.document ? ` · ${p.client.documentLabel} ${esc(p.client.document)}` : "";
  const acceptance = `<section class="sec">
  ${eyebrow("Aprovação")}
  <h2>Validade e aceite da proposta</h2>
  <div class="valid"><span class="clock">${icons.clock}</span>
    <div class="main"><small>Esta proposta é válida por</small><b>${plural(p.validityDays, "dia", "dias")}</b>
      <span>Emitida em ${dmy(p.issueDate)} · vence em <strong>${dataPorExtenso(p.validUntil)}</strong></span></div>
    <div class="side"><span>PROPOSTA</span><b>${esc(p.number)}</b><span>VALOR</span><b>${money(p.totals.total)}</b></div></div>
  <p class="accept">Declaro que li e estou de acordo com o escopo, os valores, as condições de pagamento e o cronograma apresentados nesta proposta, autorizando a <b>JMG Reformas</b> a iniciar a execução da obra no endereço <b>${esc(p.site.full)}</b>. Após a assinatura, será emitido o contrato de prestação de serviços correspondente.</p>
  <div class="place">Local e data: <i style="width:46mm"></i> , <i style="width:12mm"></i> de <i style="width:46mm"></i> de 20<i style="width:9mm"></i></div>
  <div class="signs"><div><b>${esc(p.client.name)}</b>Contratante${doc}</div>
    <div><b>${esc(p.responsible)}</b>Responsável técnico · JMG Reformas</div></div>
</section>`;
  return `${htmlOpen(layout)}<head><meta charset="utf-8"><title>${esc(p.number)}</title>
<style>${baseCss(assets, layout)}${css}</style></head><body>${cover}${[about, scope, materials, invest, schedule, acceptance].join(divider)}${footerHtml(assets, p.company)}</body></html>`;
}

import type { Assets } from "./assets.ts";

// Identidade visual comum ao orçamento e ao contrato (modelo aprovado pelo Guilherme):
// capa azul-marinho com a logo como marca d'água, azul da marca e detalhes dourados.
// Cabeçalho e rodapé das páginas internas são carimbados depois com pdf-lib (render.ts).

export const NAVY = "#112440";
export const BLUE = "#004AAD";
export const BLUE_LIGHT = "#2F7FE3";
export const GOLD = "#E8A33D";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (n: number) => brl.format(Number(n) || 0).replace(/\u00a0/g, " ");
export const num = (n: number) =>
  (Number(n) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export const pct = (n: number) => `${num(n)}%`;
export const dmy = (iso: string | null) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "a definir";
export const pad2 = (n: number) => String(n).padStart(2, "0");

export function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Cor da etapa: alterna azul forte e azul claro. */
export const stageColor = (n: number) => (n % 2 === 1 ? BLUE : BLUE_LIGHT);

export const icons = {
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12.5l4 4 8-9"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  invest: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="16" cy="30" rx="9" ry="3.5"/><path d="M7 30v5c0 2 4 3.5 9 3.5s9-1.5 9-3.5v-5"/><path d="M7 35v0"/><ellipse cx="16" cy="25" rx="9" ry="3.5"/><path d="M31 38V27M36 38V22M41 38V17"/><path d="M27 18l6-6 4 3 6-7"/><path d="M39 8h4v4"/></svg>`,
};

export function eyebrow(text: string) {
  return `<div class="eyebrow"><span></span>${esc(text)}</div>`;
}

export function baseCss(assets: Assets) {
  return `${assets.css}
@page { size: A4; margin: 24mm 16mm 20mm 16mm; }
@page cover { margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: Inter, sans-serif; color: #1B2539; font-size: 10.5pt; line-height: 1.45;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { break-before: page; }
.cover { page: cover; position: relative; width: 210mm; height: 297mm; overflow: hidden;
  background: ${NAVY}; color: #fff; }
.cover .grid { position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 9mm 9mm; }
.cover .mark { position: absolute; right: -78mm; top: 18mm; width: 225mm; opacity: .07; }
.cover .brand { position: absolute; left: 18mm; top: 19mm; display: flex; align-items: center; gap: 5mm; }
.cover .brand img { width: 31mm; }
.cover .brand .sep { width: 1px; height: 11mm; background: rgba(255,255,255,.45); }
.cover .brand .name { font-weight: 700; letter-spacing: .32em; font-size: 11pt; line-height: 1.5; }
.cover .code { position: absolute; right: 17mm; top: 20mm; border: 1px solid rgba(255,255,255,.35);
  border-radius: 99px; padding: 1.6mm 3.6mm; font-size: 8.5pt; letter-spacing: .18em; color: rgba(255,255,255,.75); }
.cover .hero { position: absolute; left: 18mm; right: 18mm; top: 108mm; }
.cover .kicker { text-transform: uppercase; display: flex; align-items: center; gap: 3mm; color: ${GOLD}; font-weight: 600;
  letter-spacing: .22em; font-size: 9.5pt; }
.cover .kicker span { width: 10mm; height: 2px; background: ${GOLD}; display: inline-block; }
.cover h1 { margin: 6mm 0 0; font-size: 47pt; line-height: 1.02; font-weight: 800; letter-spacing: -.02em; }
.cover h1 em { font-style: normal; color: ${GOLD}; }
.cover .subtitle { margin-top: 6mm; font-size: 15pt; color: rgba(255,255,255,.78); font-weight: 400; }
.chips { display: flex; flex-wrap: wrap; gap: 2.4mm; margin-top: 6mm; }
.cover .chip { border: 1px solid rgba(255,255,255,.35); border-radius: 99px; padding: 1.8mm 3.6mm;
  font-size: 8.8pt; font-weight: 500; color: rgba(255,255,255,.92); }
.cover .card { position: absolute; left: 18mm; right: 17mm; top: 212mm; display: flex; gap: 8mm;
  border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); border-radius: 3mm; padding: 7mm 6mm; }
.cover .card > div:last-child { flex: 1.35; }
.cover .card > div { flex: 1; min-width: 0; display: flex; gap: 4mm; align-items: flex-start; }
.cover .ico { width: 9mm; height: 9mm; flex: none; border-radius: 99px; background: rgba(255,255,255,.1);
  color: ${GOLD}; display: flex; align-items: center; justify-content: center; }
.cover .ico svg { width: 4.4mm; height: 4.4mm; }
.cover .lbl { font-size: 7.3pt; letter-spacing: .14em; color: rgba(255,255,255,.55); font-weight: 600; text-transform: uppercase; }
.cover .val { font-size: 12pt; font-weight: 600; margin-top: 1mm; line-height: 1.3; }
.cover .sub { font-size: 9pt; color: rgba(255,255,255,.62); margin-top: .8mm; }
.cover .facts { position: absolute; left: 18mm; right: 17mm; top: 258mm; border-top: 1px solid rgba(255,255,255,.22);
  padding-top: 6mm; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
.cover .facts .val { font-size: 11pt; }
.cover .stripe { position: absolute; left: 0; right: 0; bottom: 0; height: 3.2mm; display: flex; }
.cover .stripe i:first-child { flex: 7; background: ${BLUE}; } .cover .stripe i:last-child { flex: 3; background: ${GOLD}; }
.eyebrow { display: flex; align-items: center; gap: 3mm; color: ${BLUE}; font-weight: 700; letter-spacing: .2em;
  font-size: 8pt; text-transform: uppercase; }
.eyebrow span { width: 7mm; height: 2px; background: ${GOLD}; display: inline-block; }
h2 { margin: 3mm 0 0; font-size: 22pt; line-height: 1.2; font-weight: 700; letter-spacing: -.015em; color: #16233F; }
.lead { color: #5B6472; font-size: 10.5pt; line-height: 1.55; margin: 4mm 0 0; max-width: 160mm; }
.muted { color: #6B7280; }
.badge { display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { font-size: 7.4pt; letter-spacing: .14em; color: #8A93A1; font-weight: 500; text-transform: uppercase; text-align: left; }
.r { text-align: right; } .c { text-align: center; }
.nb { white-space: nowrap; }
`;
}

export function coverHtml(
  assets: Assets,
  o: {
    code: string;
    kicker: string;
    title: string;
    subtitle: string;
    chips: string[];
    client: { name: string; sub?: string };
    site: { line1: string; line2: string };
    facts: { label: string; value: string }[];
  },
) {
  return `<section class="cover">
  <div class="grid"></div>
  <img class="mark" src="${assets.logoWhite}" alt="">
  <div class="brand"><img src="${assets.logoWhite}" alt="JMG"><div class="sep"></div><div class="name">JMG<br>REFORMAS</div></div>
  <div class="code">${esc(o.code)}</div>
  <div class="hero">
    <div class="kicker"><span></span>${esc(o.kicker)}</div>
    <h1>${o.title}</h1>
    <div class="subtitle">${esc(o.subtitle)}</div>
    <div class="chips">${o.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
  </div>
  <div class="card">
    <div><span class="ico">${icons.user}</span><div><div class="lbl">Cliente</div><div class="val">${esc(o.client.name)}</div>${o.client.sub ? `<div class="sub">${esc(o.client.sub)}</div>` : ""}</div></div>
    <div><span class="ico">${icons.pin}</span><div><div class="lbl">Endereço da obra</div><div class="val">${esc(o.site.line1)}</div><div class="sub">${esc(o.site.line2)}</div></div></div>
  </div>
  <div class="facts">${o.facts.map((f) => `<div><div class="lbl">${esc(f.label)}</div><div class="val">${esc(f.value)}</div></div>`).join("")}</div>
  <div class="stripe"><i></i><i></i></div>
</section>`;
}

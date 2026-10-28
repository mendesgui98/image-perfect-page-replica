// Gera um orçamento de exemplo (dados do modelo aprovado) para conferir o visual sem banco:
//   node --experimental-strip-types api/src/pdf/sample.ts saida.pdf [--contrato]
import { writeFileSync } from "node:fs";
import { buildProposal, DEFAULT_TERMS, SCHEDULE_DISCLAIMER } from "../../../src/lib/proposal.ts";
import { emptyParams } from "../../../src/lib/pricing.ts";
import { loadAssets } from "./assets.ts";
import { contractHtml } from "./contract-html.ts";
import { proposalHtml } from "./proposal-html.ts";
import { closeBrowser, htmlToPdf } from "./render.ts";

const mat = (name: string, unit: string, price: number, consumption: number) => ({
  name,
  consumption_unit: unit,
  purchase_unit: unit,
  conversion: 1,
  consumption,
  loss_pct: 0,
  price,
  supplied_by: "jmg" as const,
});
const stages = [
  [
    "Serviços preliminares e demolição",
    "Proteção das áreas, retirada de revestimentos e descarte de entulho.",
    1,
    1,
  ],
  ["Instalações hidráulicas", "Readequação de pontos de água fria, quente e esgoto.", 2, 1],
  [
    "Instalações elétricas",
    "Novos circuitos para cozinha e banheiro e substituição de pontos.",
    2,
    2,
  ],
  [
    "Alvenaria, reboco e contrapiso",
    "Regularização de paredes e pisos para receber os revestimentos.",
    3,
    1,
  ],
  [
    "Revestimentos – pisos e paredes",
    "Assentamento de porcelanato e revestimentos cerâmicos.",
    4,
    2,
  ],
  ["Forro de gesso", "Forro em drywall com tabica e preparação para iluminação embutida.", 5, 1],
  ["Pintura", "Preparação e pintura de paredes, tetos e forro.", 6, 2],
  ["Louças, metais e entrega", "Instalação final, limpeza fina e vistoria de entrega.", 7, 2],
] as const;
const sections = stages.map(([title, description, start_week, duration_weeks], i) => ({
  id: `s${i}`,
  title,
  description,
  start_week,
  duration_weeks,
}));
const items = sections.flatMap((s, i) =>
  [0, 1, 2, 3].map((k) => ({
    section_id: s.id,
    description: `Serviço ${k + 1} da etapa ${s.title.toLowerCase()}`,
    unit: ["m2", "un", "ml", "vb"][k]!,
    quantity: [24, 4, 30, 1][k]!,
    labor_cost_unit: [60, 120, 25, 900][k]!,
    materials:
      k < 2
        ? [mat(`Material ${i + 1}.${k + 1} (embalagem)`, ["sc", "rl"][k]!, 38 + i * 10, 0.5)]
        : [],
    labor_markup_override: null,
    materials_markup_override: null,
    item_discount: 0,
  })),
);
const data = buildProposal({
  today: new Date().toISOString().slice(0, 10),
  client: {
    name: "Mariana Albuquerque Ribeiro",
    document: "00000000000",
    rg: "000000000",
    endereco: "Rua das Palmeiras, 482 – Apto 1203",
    bairro: "Jardim Europa",
    cidade: "São Paulo",
    uf: "SP",
    cep: "01449000",
  },
  sections,
  items,
  budget: {
    number: 147,
    revision: 0,
    status: "aprovado",
    title: "Reforma completa de apartamento",
    description:
      "Reforma de cozinha, área de serviço e banheiro social, com troca de revestimentos, readequação elétrica e hidráulica, forro de gesso e pintura geral.",
    client_display: "Mariana Albuquerque Ribeiro",
    endereco: "Rua das Palmeiras, 482 – Apto 1203",
    bairro: "Jardim Europa",
    cidade: "São Paulo",
    uf: "SP",
    cep: "01449000",
    issue_date: "2026-10-28",
    validity_date: null,
    start_date: "2026-11-16",
    estimated_weeks: null,
    property_type: "Apartamento",
    property_area: 78,
    responsible: null,
    notes: null,
    general_discount: 0,
    params: { ...emptyParams, labor_markup: 40, materials_markup: 10 },
    payment_terms: DEFAULT_TERMS,
  },
});
const assets = loadAssets();
const out = process.argv[2] ?? "orcamento-exemplo.pdf";
const contract = process.argv.includes("--contrato");
const footerLeft = "JMG Reformas LTDA · CNPJ 62.780.542/0001-81 · (11) 99893-7694 · @jmg.reformas";
writeFileSync(
  out,
  contract
    ? await htmlToPdf(contractHtml(data, assets, data.issueDate), assets, {
        headerRight: `Contrato · ${data.number} · ${data.client.name}`,
        footerLeft,
      })
    : await htmlToPdf(proposalHtml(data, assets, SCHEDULE_DISCLAIMER), assets, {
        headerRight: `${data.number} · ${data.client.name}`,
        footerLeft,
      }),
);
await closeBrowser();
console.log(out);

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { DEFAULT_TERMS, type ProposalData, type ProposalInput } from "../../src/lib/proposal.ts";
import { emptyParams } from "../../src/lib/pricing.ts";
import { fakeRepo, start, token } from "./helpers.ts";

const ID = "11111111-2222-3333-4444-555555555555";
const input = (status: string, pct = 30): Omit<ProposalInput, "today"> => ({
  client: null,
  sections: [
    { id: "s1", title: "Pintura", description: null, start_week: null, duration_weeks: null },
  ],
  items: [
    {
      section_id: "s1",
      description: "Pintura acrílica",
      unit: "m2",
      quantity: 10,
      labor_cost_unit: 50,
      materials: [],
      labor_markup_override: null,
      materials_markup_override: null,
      item_discount: 0,
    },
  ],
  budget: {
    number: 7,
    revision: 0,
    status,
    title: "Reforma",
    description: null,
    client_display: "Cliente Teste",
    endereco: "Rua A, 1",
    bairro: null,
    cidade: "São Paulo",
    uf: "SP",
    cep: null,
    issue_date: "2026-10-01",
    validity_date: null,
    start_date: null,
    estimated_weeks: null,
    property_type: null,
    property_area: null,
    responsible: null,
    notes: null,
    general_discount: 0,
    params: emptyParams,
    payment_terms: [{ ...DEFAULT_TERMS[0]!, pct }, ...DEFAULT_TERMS.slice(1)],
  },
});

let current = input("elaboracao");
const rendered: ProposalData[] = [];
const layouts: string[] = [];
const repo = fakeRepo({ adm: ["admin"], eq: ["equipe"] });
repo.proposalInput = async (_c, id) => (id === ID ? current : null);
const api = await start({
  repo,
  today: () => "2026-10-28",
  pdf: {
    proposal: async (d, layout) => (
      rendered.push(d),
      layouts.push(layout),
      Buffer.from("%PDF-orcamento")
    ),
    contract: async (d, _today, _clauses, layout) => (
      rendered.push(d),
      layouts.push(layout),
      Buffer.from("%PDF-contrato")
    ),
  },
});
after(() => api.close());

const post = (path: string, sub = "adm") =>
  api.call(path, { method: "POST", auth: token({ sub }) });

test("gera o PDF do orçamento com os dados do banco", async () => {
  const r = await post(`/v1/orcamentos/${ID}/pdf`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "application/pdf");
  assert.match(r.headers.get("content-disposition") ?? "", /ORC-2026-0007\.pdf/);
  assert.equal(await r.text(), "%PDF-orcamento");
  const d = rendered.at(-1)!;
  assert.equal(d.issueDate, "2026-10-28");
  assert.equal(d.validUntil, "2026-11-12");
  assert.equal(d.totals.total, 500);
});

test("PDF sai contínuo por padrão e paginado quando pedido", async () => {
  assert.equal((await post(`/v1/orcamentos/${ID}/pdf`)).status, 200);
  assert.equal(layouts.at(-1), "continuo");
  assert.equal((await post(`/v1/orcamentos/${ID}/pdf?layout=paginado`)).status, 200);
  assert.equal(layouts.at(-1), "paginado");
  assert.equal((await post(`/v1/orcamentos/${ID}/pdf?layout=qualquer`)).status, 200);
  assert.equal(layouts.at(-1), "continuo");
});

test("equipe não gera PDF com valores", async () => {
  assert.equal((await post(`/v1/orcamentos/${ID}/pdf`, "eq")).status, 403);
});

test("parcelas que não fecham 100% bloqueiam o PDF", async () => {
  current = input("elaboracao", 20);
  const r = await post(`/v1/orcamentos/${ID}/pdf`);
  assert.equal(r.status, 422);
  assert.match((await r.json()).message, /90%/);
  current = input("elaboracao");
});

test("contrato só sai de orçamento aprovado", async () => {
  const r = await post(`/v1/orcamentos/${ID}/contrato`);
  assert.equal(r.status, 422);
  assert.match((await r.json()).message, /aprovado/);
  current = input("aprovado");
  const ok = await post(`/v1/orcamentos/${ID}/contrato`);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("content-disposition") ?? "", /Contrato-ORC-2026-0007/);
  assert.equal(layouts.at(-1), "continuo");
  assert.equal((await post(`/v1/orcamentos/${ID}/contrato?layout=paginado`)).status, 200);
  assert.equal(layouts.at(-1), "paginado");
});

test("orçamento inexistente devolve 404", async () => {
  assert.equal((await post("/v1/orcamentos/99999999-2222-3333-4444-555555555555/pdf")).status, 404);
});

test("data do banco não muda de dia no fuso de São Paulo", async () => {
  const { isoDate } = await import("../src/repo.ts");
  assert.equal(isoDate(new Date("2026-11-16")), "2026-11-16");
  assert.equal(isoDate("2026-11-16"), "2026-11-16");
  assert.equal(isoDate(null), null);
});

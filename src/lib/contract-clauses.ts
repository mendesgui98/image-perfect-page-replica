// Modelo de cláusulas do contrato (tabela contract_clauses, editada em Configurações → Contrato).
// Módulo puro, usado pela API (PDF) e pela tela (ajuda e validação dos marcadores).
// Cada linha do texto vira um parágrafo; linhas "{{N}}.x.y." e incisos romanos ficam recuados.

export interface ContractClause {
  title: string;
  body: string;
}

export const CLAUSE_TOKENS = [
  { token: "{{N}}", help: "número da cláusula (acompanha a ordem)" },
  { token: "{{ORCAMENTO}}", help: "orçamento ORC-… (Anexo 1)" },
  { token: "{{ENDERECO_OBRA}}", help: "endereço completo da obra" },
  { token: "{{VALOR}}", help: "valor total com o valor por extenso" },
  { token: "{{INICIO}}", help: "data de início prevista" },
  { token: "{{PRAZO}}", help: "prazo estimado em semanas, por extenso" },
  { token: "{{TABELA_ETAPAS}}", help: "tabela das etapas (linha sozinha)" },
  { token: "{{TABELA_PARCELAS}}", help: "tabela das parcelas (linha sozinha)" },
  { token: "{{DADOS_BANCARIOS}}", help: "quadro com os dados bancários (linha sozinha)" },
] as const;

export const BLOCK_TOKENS = ["TABELA_ETAPAS", "TABELA_PARCELAS", "DADOS_BANCARIOS"] as const;
export type BlockToken = (typeof BLOCK_TOKENS)[number];
export type InlineValues = Record<
  "ORCAMENTO" | "ENDERECO_OBRA" | "VALOR" | "INICIO" | "PRAZO",
  string
>;

export type ClauseBlock =
  { kind: "p" | "sub"; html: string } | { kind: "block"; block: BlockToken };

const KNOWN = new Set(CLAUSE_TOKENS.map((t) => t.token.slice(2, -2)));

/** Marcadores desconhecidos no texto (avisados na tela antes de salvar). */
export function unknownTokens(body: string) {
  return [...body.matchAll(/\{\{\s*([A-Z_]+)\s*\}\}/g)]
    .map((m) => m[1]!)
    .filter((t, i, a) => !KNOWN.has(t) && a.indexOf(t) === i);
}

function esc(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Cláusulas numeradas pela ordem, com o texto escapado e os marcadores trocados pelos valores
 * (que já chegam em HTML). Cláusula sem título é ignorada.
 */
export function renderClauses(clauses: ContractClause[], values: InlineValues) {
  return clauses
    .filter((c) => c.title.trim())
    .map((c, i) => {
      const n = String(i + 1);
      const blocks: ClauseBlock[] = c.body
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line): ClauseBlock => {
          const block = /^\{\{\s*([A-Z_]+)\s*\}\}$/.exec(line)?.[1];
          if (block && (BLOCK_TOKENS as readonly string[]).includes(block))
            return { kind: "block", block: block as BlockToken };
          const text = line.replace(/\{\{\s*N\s*\}\}/g, n);
          const html = esc(text).replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (m, t: string) =>
            t in values ? values[t as keyof InlineValues] : m,
          );
          const sub = /^\d+\.\d+\.\d+\.?\s/.test(text) || /^[IVXLC]+\s*[–-]\s/.test(text);
          return { kind: sub ? "sub" : "p", html };
        });
      return { number: i + 1, title: c.title.trim(), blocks };
    });
}

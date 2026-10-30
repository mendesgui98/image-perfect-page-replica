// Modelo de cláusulas do contrato (tabela contract_clauses, editada em Configurações → Contrato).
// Módulo puro, usado pela API (PDF) e pela tela (ajuda e validação dos marcadores).
// Cada linha do texto vira um parágrafo: "{{N}}.x." leva o número em destaque, "{{N}}.x.y." fica
// recuado, "I – …" vira inciso, "- …" vira item com marcador e **texto** sai em negrito.

export interface ContractClause {
  title: string;
  body: string;
}

export const CLAUSE_TOKENS = [
  { token: "{{N}}", help: "número da cláusula (acompanha a ordem)" },
  { token: "{{OBJETO}}", help: "título e descrição da obra, do orçamento" },
  { token: "{{ENDERECO_OBRA}}", help: "endereço completo da obra" },
  { token: "{{AREA}}", help: "“, com área aproximada de … m²” (vazio sem área)" },
  { token: "{{ORCAMENTO}}", help: "Orçamento nº ORC-… (Anexo 1)" },
  { token: "{{DATA_ORCAMENTO}}", help: "data de emissão do orçamento" },
  { token: "{{VALOR}}", help: "valor total com o valor por extenso" },
  { token: "{{MAO_DE_OBRA}}", help: "total da mão de obra" },
  { token: "{{MATERIAIS}}", help: "total dos materiais" },
  { token: "{{INICIO}}", help: "data de início prevista" },
  { token: "{{PRAZO}}", help: "prazo estimado em semanas" },
  { token: "{{TABELA_ETAPAS}}", help: "tabela das etapas (linha sozinha)" },
  { token: "{{TABELA_PARCELAS}}", help: "parcelas com o total (linha sozinha)" },
  { token: "{{DADOS_BANCARIOS}}", help: "quadro com os dados bancários (linha sozinha)" },
] as const;

export const BLOCK_TOKENS = ["TABELA_ETAPAS", "TABELA_PARCELAS", "DADOS_BANCARIOS"] as const;
export type BlockToken = (typeof BLOCK_TOKENS)[number];
export type InlineValues = Record<
  | "OBJETO"
  | "ENDERECO_OBRA"
  | "AREA"
  | "ORCAMENTO"
  | "DATA_ORCAMENTO"
  | "VALOR"
  | "MAO_DE_OBRA"
  | "MATERIAIS"
  | "INICIO"
  | "PRAZO",
  string
>;

export type ClauseBlock =
  | { kind: "p" | "sub"; num: string | null; html: string }
  | { kind: "roman"; num: string; html: string }
  | { kind: "item"; html: string }
  | { kind: "block"; block: BlockToken };

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

/** Texto escapado, com **negrito** e os marcadores trocados pelos valores (já em HTML). */
function lineHtml(text: string, values: InlineValues) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (m, t: string) =>
      t in values ? values[t as keyof InlineValues] : m,
    );
}

/**
 * Cláusulas numeradas pela ordem, com o texto escapado e os marcadores trocados pelos valores.
 * Cláusula sem título é ignorada.
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
          const item = /^[-•]\s+(.*)$/.exec(text);
          if (item) return { kind: "item", html: lineHtml(item[1]!, values) };
          const roman = /^([IVXLC]+)\s*[–-]\s+(.*)$/.exec(text);
          if (roman) return { kind: "roman", num: roman[1]!, html: lineHtml(roman[2]!, values) };
          const numbered = /^(\d+(?:\.\d+)*\.)\s+(.*)$/.exec(text);
          const num = numbered?.[1] ?? null;
          return {
            kind: num && /^\d+\.\d+\.\d+/.test(num) ? "sub" : "p",
            num,
            html: lineHtml(numbered?.[2] ?? text, values),
          };
        });
      return { number: i + 1, title: c.title.trim(), blocks };
    });
}

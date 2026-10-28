// Valores e datas por extenso (propostas e contratos). Módulo puro, sem dependências: também é
// importado pela API (api/), por isso os imports usam extensão .ts.

const UN: string[] = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZ: string[] = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const CEN: string[] = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100),
    r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CEN[c]!);
  if (r) {
    if (r < 20) parts.push(UN[r]!);
    else {
      const d = Math.floor(r / 10),
        u = r % 10;
      parts.push(u ? `${DEZ[d]} e ${UN[u]}` : DEZ[d]!);
    }
  }
  return parts.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const parts: string[] = [];
  if (milhoes) parts.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) parts.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) parts.push(ate999(resto));
  if (parts.length === 1) return parts[0]!;
  const last = parts[parts.length - 1];
  const joinE = resto > 0 && (resto < 100 || resto % 100 === 0);
  // Sem "e", a última classe vem depois de vírgula: "cinquenta e três mil, duzentos e ...".
  return parts.slice(0, -1).join(" ") + (joinE ? " e " : resto > 0 ? ", " : " ") + last;
}

/** Valor em reais por extenso, ex.: 270800 -> "duzentos e setenta mil e oitocentos reais" */
export function reaisPorExtenso(valor: number): string {
  const total = Math.round((Number(valor) || 0) * 100);
  const reais = Math.floor(total / 100);
  const cent = total % 100;
  let s = "";
  if (reais > 0) {
    const ex = inteiroPorExtenso(reais);
    const de = reais % 1_000_000 === 0 ? " de" : "";
    s = `${ex}${de} ${reais === 1 ? "real" : "reais"}`;
  }
  if (cent > 0) s += `${s ? " e " : ""}${ate999(cent)} ${cent === 1 ? "centavo" : "centavos"}`;
  return s || "zero reais";
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Número inteiro por extenso, ex.: 8 -> "oito". */
export function numeroPorExtenso(n: number): string {
  return inteiroPorExtenso(Math.max(0, Math.floor(Number(n) || 0)));
}

/** Data ISO (aaaa-mm-dd) por extenso, ex.: "12 de novembro de 2026". */
export function dataPorExtenso(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d} de ${MESES[Number(m) - 1] ?? ""} de ${y}`;
}

/** Dia e mês abreviado, ex.: "16 de nov". */
export function diaMesCurto(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d} de ${(MESES[Number(m) - 1] ?? "").slice(0, 3)}`;
}

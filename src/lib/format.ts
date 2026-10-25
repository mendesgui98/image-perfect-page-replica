const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const fmtBRL = (n: number | null | undefined) => brl.format(Number(n) || 0);
export const fmtNum = (n: number | null | undefined, d = 2) =>
  (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });
export const fmtPct = (frac: number) =>
  `${(frac * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
};

export const UNIT_LABEL: Record<string, string> = {
  m2: "m²",
  ml: "m linear",
  un: "unidade",
  diaria: "diária",
  vb: "serviço fechado",
};

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
  return parts.slice(0, -1).join(" ") + (joinE ? " e " : " ") + last;
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

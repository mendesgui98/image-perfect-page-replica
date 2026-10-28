// Pontuação de CPF, CNPJ e RG. As máscaras são progressivas (servem durante a
// digitação) e idempotentes (reaplicar sobre um valor já pontuado não muda nada).

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** Aplica um padrão como "000.000.000-00" aos caracteres informados. */
function mask(chars: string, pattern: string) {
  let out = "";
  let i = 0;
  for (const p of pattern) {
    if (i >= chars.length) break;
    if (p === "0") out += chars[i++];
    else out += p;
  }
  return out;
}

/** CPF: 000.000.000-00 */
export function formatCpf(v: string | null | undefined) {
  return mask(digits(v).slice(0, 11), "000.000.000-00");
}

/** CNPJ: 00.000.000/0000-00 */
export function formatCnpj(v: string | null | undefined) {
  return mask(digits(v).slice(0, 14), "00.000.000/0000-00");
}

/** Campo único CPF/CNPJ: até 11 dígitos é CPF; a partir do 12º vira CNPJ. */
export function formatCpfCnpj(v: string | null | undefined) {
  return digits(v).length > 11 ? formatCnpj(v) : formatCpf(v);
}

/**
 * RG no padrão mais usado (SP): 00.000.000-0, com dígito verificador que pode ser X.
 * O RG não tem formato nacional único: só recebe pontuação quando tem os 9
 * caracteres desse padrão; outros tamanhos (outros estados) ficam como digitados.
 */
export function formatRg(v: string | null | undefined) {
  const raw = (v ?? "").trim();
  const chars = raw.toUpperCase().replace(/[^0-9X]/g, "");
  // X só vale como último caractere (dígito verificador).
  if (chars.length !== 9 || /X./.test(chars)) return raw;
  return mask(chars, "00.000.000-0");
}

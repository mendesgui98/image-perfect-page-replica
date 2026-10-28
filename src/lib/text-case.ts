import type { FormEvent } from "react";

// Maiúscula automática em nomes e endereços: só a letra que acabou de ser
// digitada no início de uma palavra vira maiúscula. Correções feitas depois
// (apagar e digitar minúscula no meio da palavra) não são desfeitas.

// Partículas que ficam minúsculas no meio do nome ("Maria da Silva", "Rua do Porto").
const CONNECTORS = new Set(["da", "das", "de", "di", "do", "dos", "du", "e"]);

const isLetter = (c: string) => /\p{L}/u.test(c);
const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);

/**
 * Ajusta o valor depois de inserir `data` terminando na posição `caret`.
 * O tamanho do texto nunca muda, então o cursor fica onde estava.
 */
export function autoCapitalize(value: string, caret: number, data: string): string {
  if (data.length !== 1) return value;
  const pos = caret - 1;
  if (value[pos] !== data) return value;

  if (isLetter(data) && isSpace(value[pos - 1])) {
    return value.slice(0, pos) + data.toLocaleUpperCase("pt-BR") + value.slice(caret);
  }

  if (data === " ") {
    let start = pos;
    while (start > 0 && !isSpace(value[start - 1])) start--;
    const word = value.slice(start, pos);
    const lower = word.toLocaleLowerCase("pt-BR");
    const capitalized = lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
    if (start > 0 && CONNECTORS.has(lower) && word === capitalized) {
      return value.slice(0, start) + lower + value.slice(pos);
    }
  }
  return value;
}

/** onInput de campos de nome/endereço: aplica a maiúscula na letra digitada. */
export function capitalizeWordsOnInput(e: FormEvent<HTMLInputElement>) {
  const native = e.nativeEvent as InputEvent;
  if (native.inputType !== "insertText" || !native.data) return;
  const el = e.currentTarget;
  const caret = el.selectionStart ?? el.value.length;
  const next = autoCapitalize(el.value, caret, native.data);
  if (next === el.value) return;
  el.value = next;
  el.setSelectionRange(caret, caret);
}

/** Props para um <Input> de nome/endereço (inclui teclado de celular com maiúsculas). */
export const capitalizeWordsProps = {
  autoCapitalize: "words",
  onInput: capitalizeWordsOnInput,
} as const;

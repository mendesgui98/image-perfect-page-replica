// Enter salva formulários: decide o que fazer com um Enter e acha o botão
// padrão. O ouvinte global (components/enter-submit.tsx) só aplica a decisão.

export type EnterIntent = "submit" | "block" | "ignore";

export interface EnterKeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
  defaultPrevented: boolean;
}

// Tipos de input em que Enter confirma o formulário (texto, número, data…).
const TEXT_LIKE = new Set([
  "",
  "text",
  "search",
  "email",
  "tel",
  "url",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
]);

export function enterIntent(event: EnterKeyInput, target: Element | null): EnterIntent {
  if (event.key !== "Enter" || event.isComposing || event.defaultPrevented || event.altKey)
    return "ignore";
  if (!(target instanceof HTMLElement)) return "ignore";
  const form = enterForm(target);
  if (!form) return "ignore";
  // Combobox/autocomplete aberto: o Enter escolhe a opção, nunca salva.
  if (target.getAttribute("aria-expanded") === "true") return "block";
  if (target instanceof HTMLTextAreaElement)
    return event.ctrlKey || event.metaKey ? "submit" : "ignore";
  if (event.shiftKey) return "ignore";
  if (target instanceof HTMLSelectElement) return "submit";
  if (target instanceof HTMLInputElement)
    return TEXT_LIKE.has(target.type) && !target.readOnly ? "submit" : "ignore";
  return "ignore";
}

// Só formulários que contêm o campo no DOM (conteúdo em portal fica fora) e
// que não desligaram o atalho com data-enter-submit="off".
export function enterForm(target: HTMLElement): HTMLFormElement | null {
  const form = target.closest("form");
  if (!form || form.dataset["enterSubmit"] === "off") return null;
  return form;
}

// Mesmo critério do navegador: o primeiro botão de envio do formulário.
// Botão desabilitado ou formulário ocupado (aria-busy) não salvam.
export function defaultSubmitter(form: HTMLFormElement): HTMLElement | null {
  if (form.getAttribute("aria-busy") === "true") return null;
  const button = Array.from(form.elements).find(
    (el): el is HTMLButtonElement | HTMLInputElement =>
      (el instanceof HTMLButtonElement && el.type === "submit") ||
      (el instanceof HTMLInputElement && (el.type === "submit" || el.type === "image")),
  );
  if (!button || button.disabled) return null;
  return button;
}

// Aplica a decisão num KeyboardEvent real. Retorna true quando salvou.
export function handleEnterKey(event: KeyboardEvent): boolean {
  const target = event.target instanceof Element ? event.target : null;
  const intent = enterIntent(event, target);
  if (intent === "ignore" || !target) return false;
  event.preventDefault();
  if (intent === "block" || event.repeat) return false;
  const form = enterForm(target as HTMLElement);
  const submitter = form && defaultSubmitter(form);
  if (!form || !submitter) return false;
  form.requestSubmit(submitter);
  return true;
}

// Campos que salvam no onBlur (edição em linha): Enter confirma o campo.
export function commitOnEnter(e: {
  key: string;
  nativeEvent: { isComposing: boolean };
  preventDefault: () => void;
  currentTarget: HTMLElement;
}) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  e.currentTarget.blur();
}

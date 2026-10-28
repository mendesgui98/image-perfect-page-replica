import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSubmitter, enterIntent, handleEnterKey } from "./enter-submit";

function mount(html: string) {
  const form = document.createElement("form");
  form.innerHTML = html;
  document.body.append(form);
  const submitted = vi.fn();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitted();
  });
  return { form, submitted };
}

function press(target: Element, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return { event, handled: handleEnterKey(event) };
}

const key = { key: "Enter", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
const plain = { ...key, isComposing: false, defaultPrevented: false };

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Enter salva formulários", () => {
  it("salva em campos de texto, número, data e select", () => {
    const { form } = mount(
      '<input name="a"><input type="number"><input type="date"><select><option>1</option></select><button>Salvar</button>',
    );
    for (const el of Array.from(form.querySelectorAll("input, select")))
      expect(enterIntent(plain, el)).toBe("submit");
  });

  it("não salva com Enter em textarea, só com Ctrl/Cmd+Enter", () => {
    const { form } = mount("<textarea></textarea><button>Salvar</button>");
    const area = form.querySelector("textarea");
    expect(enterIntent(plain, area)).toBe("ignore");
    expect(enterIntent({ ...plain, ctrlKey: true }, area)).toBe("submit");
    expect(enterIntent({ ...plain, metaKey: true }, area)).toBe("submit");
  });

  it("bloqueia o Enter quando um combobox está aberto", () => {
    const { form } = mount('<input role="combobox" aria-expanded="true"><button>Salvar</button>');
    expect(enterIntent(plain, form.querySelector("input"))).toBe("block");
  });

  it("ignora checkbox, botões, campos fora de formulário e Enter já tratado", () => {
    const { form } = mount('<input type="checkbox"><input type="file"><button>Salvar</button>');
    for (const el of Array.from(form.querySelectorAll("input, button")))
      expect(enterIntent(plain, el)).toBe("ignore");
    const loose = document.createElement("input");
    document.body.append(loose);
    expect(enterIntent(plain, loose)).toBe("ignore");
    expect(enterIntent({ ...plain, defaultPrevented: true }, form.querySelector("input"))).toBe(
      "ignore",
    );
    expect(enterIntent({ ...plain, isComposing: true }, loose)).toBe("ignore");
  });

  it("usa o primeiro botão de envio, pulando botões type=button", () => {
    const { form } = mount(
      '<button type="button">+ Material</button><button type="button">Lixeira</button><button id="s">Salvar</button>',
    );
    expect(defaultSubmitter(form)?.id).toBe("s");
  });

  it("não salva com botão desabilitado ou formulário ocupado", () => {
    const { form } = mount("<button disabled>Salvar</button>");
    expect(defaultSubmitter(form)).toBeNull();
    const busy = mount("<button>Salvar</button>").form;
    busy.setAttribute("aria-busy", "true");
    expect(defaultSubmitter(busy)).toBeNull();
  });

  it("submete uma vez pelo botão Salvar e ignora a repetição da tecla", () => {
    const { form, submitted } = mount(
      '<input name="nome"><button type="button">Cancelar</button><button id="s">Salvar</button>',
    );
    const input = form.querySelector("input")!;
    const requestSubmit = vi.spyOn(form, "requestSubmit");
    expect(press(input).handled).toBe(true);
    expect(submitted).toHaveBeenCalledTimes(1);
    expect(requestSubmit).toHaveBeenCalledWith(form.querySelector("#s"));
    const repeat = press(input, { repeat: true });
    expect(repeat.handled).toBe(false);
    expect(repeat.event.defaultPrevented).toBe(true);
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it("respeita data-enter-submit=off", () => {
    const { form, submitted } = mount("<input><button>Salvar</button>");
    form.dataset["enterSubmit"] = "off";
    press(form.querySelector("input")!);
    expect(submitted).not.toHaveBeenCalled();
  });
});

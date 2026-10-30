import { describe, expect, it } from "vitest";
import { continuousPageCss } from "./continuous-print";

describe("continuousPageCss", () => {
  it("usa a largura A4 e a altura do documento com folga", () => {
    expect(continuousPageCss(2400)).toBe("@page { size: 210mm 2404px; margin: 0; }");
  });

  it("arredonda para cima e nunca gera página vazia", () => {
    expect(continuousPageCss(1000.2)).toBe("@page { size: 210mm 1005px; margin: 0; }");
    expect(continuousPageCss(0)).toBe("@page { size: 210mm 5px; margin: 0; }");
  });
});

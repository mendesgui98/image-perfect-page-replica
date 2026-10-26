import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme";

describe("tema", () => {
  it("segue o sistema quando não há preferência", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("preferência explícita vence o sistema", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("documentos PDF são sempre claros", () => {
    expect(resolveTheme("dark", true, "/orcamentos/1/pdf")).toBe("light");
  });
});

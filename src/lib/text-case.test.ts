import { describe, it, expect } from "vitest";
import { autoCapitalize } from "./text-case";

// Simula a digitação letra a letra no fim do campo.
function typeText(text: string, start = "") {
  let value = start;
  for (const ch of text) {
    value += ch;
    value = autoCapitalize(value, value.length, ch);
  }
  return value;
}

describe("maiúscula automática em nomes e endereços", () => {
  it("primeira letra de cada palavra", () => {
    expect(typeText("guilherme mendes")).toBe("Guilherme Mendes");
    expect(typeText("vila mariana")).toBe("Vila Mariana");
    expect(typeText("são paulo")).toBe("São Paulo");
  });

  it("partículas ficam minúsculas no meio do nome", () => {
    expect(typeText("maria da silva")).toBe("Maria da Silva");
    expect(typeText("rua dos andradas e campos")).toBe("Rua dos Andradas e Campos");
  });

  it("partícula no começo continua maiúscula", () => {
    expect(typeText("de paula")).toBe("De Paula");
  });

  it("mantém o resto como digitado (siglas e números)", () => {
    expect(typeText("av. JK 1200")).toBe("Av. JK 1200");
    expect(typeText("jMG")).toBe("JMG");
  });

  it("digitação no meio do texto", () => {
    // "Rua  Augusta" com o cursor entre os espaços: digita "x"
    expect(autoCapitalize("Rua x Augusta", 5, "x")).toBe("Rua X Augusta");
  });

  it("não refaz a maiúscula de letra já corrigida", () => {
    // Letra digitada no meio da palavra não muda.
    expect(autoCapitalize("Mcdonald", 2, "c")).toBe("Mcdonald");
  });

  it("colar texto não é alterado", () => {
    expect(autoCapitalize("joão", 4, "joão")).toBe("joão");
  });
});

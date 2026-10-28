import { describe, it, expect } from "vitest";
import { formatCnpj, formatCpf, formatCpfCnpj, formatRg } from "./documents";

describe("pontuação de documentos", () => {
  it("CPF completo e durante a digitação", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
    expect(formatCpf("1234")).toBe("123.4");
    expect(formatCpf("123456789")).toBe("123.456.789");
  });

  it("CNPJ completo", () => {
    expect(formatCnpj("26717224000102")).toBe("26.717.224/0001-02");
  });

  it("campo CPF/CNPJ decide pelo número de dígitos", () => {
    expect(formatCpfCnpj("123.456.789-01")).toBe("123.456.789-01");
    expect(formatCpfCnpj("123456789012")).toBe("12.345.678/9012");
    expect(formatCpfCnpj("26717224000102")).toBe("26.717.224/0001-02");
  });

  it("é idempotente e ignora o que não é número", () => {
    expect(formatCpfCnpj("26.717.224/0001-02")).toBe("26.717.224/0001-02");
    expect(formatCpf("abc 123.456.789-01 xyz")).toBe("123.456.789-01");
    expect(formatCpfCnpj("")).toBe("");
    expect(formatCpfCnpj(null)).toBe("");
  });

  it("limita o tamanho", () => {
    expect(formatCnpj("267172240001029999")).toBe("26.717.224/0001-02");
  });

  it("RG no padrão 00.000.000-0, com X no dígito", () => {
    expect(formatRg("123456789")).toBe("12.345.678-9");
    expect(formatRg("12345678x")).toBe("12.345.678-X");
    expect(formatRg("12.345.678-X")).toBe("12.345.678-X");
  });

  it("RG de outro tamanho (outros estados) fica como digitado", () => {
    expect(formatRg("2321321")).toBe("2321321");
    expect(formatRg("1234")).toBe("1234");
    expect(formatRg("1234567890")).toBe("1234567890");
    expect(formatRg("MG-12.345.678")).toBe("MG-12.345.678");
  });
});

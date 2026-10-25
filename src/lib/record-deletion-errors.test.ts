import { describe, expect, it } from "vitest";
import { recordDeletionErrorMessage, trashUnavailableMessage } from "./record-deletion-errors";

describe("erros de ativação da lixeira", () => {
  it("explica a função ausente mostrada na captura de tela", () => {
    expect(
      recordDeletionErrorMessage({
        code: "PGRST202",
        message:
          "Could not find the function public.manage_record_deletion(_action, _entity, _id) in the schema cache",
      }),
    ).toBe(trashUnavailableMessage);
  });
  it.each(["42703", "PGRST204"])("explica campos da migração ausentes (%s)", (code) => {
    expect(
      recordDeletionErrorMessage({ code, message: "column contracts.deleted_at does not exist" }),
    ).toBe(trashUnavailableMessage);
  });
  it("mantém erros de permissão e vínculos para orientar a correção real", () => {
    const message = "Este orçamento possui vínculos com obras.";
    expect(recordDeletionErrorMessage({ code: "P0001", message })).toBe(message);
    expect(recordDeletionErrorMessage({ code: "42501", message: "Sem permissão" })).toBe(
      "Sem permissão",
    );
  });
  it("não confunde função de outro módulo ausente com ativação da lixeira", () => {
    expect(
      recordDeletionErrorMessage({ code: "PGRST202", message: "Function unrelated missing" }),
    ).toBe("Function unrelated missing");
  });
});

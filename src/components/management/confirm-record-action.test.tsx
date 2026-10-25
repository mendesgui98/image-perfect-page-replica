import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmRecordAction } from "./confirm-record-action";
const { errorToast } = vi.hoisted(() => ({ errorToast: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: errorToast } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("confirmação de exclusão", () => {
  it("não exclui ao abrir ou cancelar e exige a confirmação digitada", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmRecordAction
        name="Cliente teste"
        description="Enviar para a lixeira"
        onConfirm={remove}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Excluir Cliente teste" }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirmar exclusão" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirmação da exclusão"), {
      target: { value: "EXCLUIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir Cliente teste" }));
    expect(screen.getByLabelText("Confirmação da exclusão")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Confirmação da exclusão"), {
      target: { value: "EXCLUIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
  });
  it("mantém o diálogo aberto e informa a falha de exclusão definitiva", async () => {
    const remove = vi.fn().mockRejectedValue(new Error("Cadastro possui vínculos."));
    render(
      <ConfirmRecordAction
        name="Cliente vinculado"
        label="Excluir definitivamente"
        description="Ação irreversível"
        onConfirm={remove}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Excluir definitivamente Cliente vinculado" }),
    );
    fireEvent.change(screen.getByLabelText("Confirmação da exclusão"), {
      target: { value: "EXCLUIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith("Cadastro possui vínculos."));
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });
});

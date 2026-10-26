import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { commitOnEnter } from "@/lib/enter-submit";
import { EnterToSubmit, SubmitForm } from "./enter-submit";

function Dialog({ onSubmit, pending = false }: { onSubmit: () => void; pending?: boolean }) {
  return (
    <>
      <EnterToSubmit />
      <SubmitForm onSubmit={onSubmit} pending={pending}>
        <input aria-label="Nome" />
        <textarea aria-label="Observações" />
        <button type="button">+ Material</button>
        <button type="submit" disabled={pending}>
          Salvar
        </button>
      </SubmitForm>
    </>
  );
}

describe("SubmitForm", () => {
  it("Enter no campo salva uma vez, sem acionar botões secundários", () => {
    const onSubmit = vi.fn();
    const secondary = vi.fn();
    render(<Dialog onSubmit={onSubmit} />);
    screen.getByText("+ Material").addEventListener("click", secondary);
    fireEvent.keyDown(screen.getByLabelText("Nome"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(secondary).not.toHaveBeenCalled();
  });

  it("textarea quebra linha com Enter e salva com Ctrl+Enter", () => {
    const onSubmit = vi.fn();
    render(<Dialog onSubmit={onSubmit} />);
    const area = screen.getByLabelText("Observações");
    fireEvent.keyDown(area, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: "Enter", ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("não salva enquanto pending", () => {
    const onSubmit = vi.fn();
    render(<Dialog onSubmit={onSubmit} pending />);
    fireEvent.keyDown(screen.getByLabelText("Nome"), { key: "Enter" });
    fireEvent.submit(screen.getByLabelText("Nome").closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("commitOnEnter", () => {
  it("Enter confirma o campo disparando o blur", () => {
    const onBlur = vi.fn();
    render(<input aria-label="Qtd" onBlur={onBlur} onKeyDown={commitOnEnter} />);
    const input = screen.getByLabelText("Qtd");
    input.focus();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

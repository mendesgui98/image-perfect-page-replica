import { useEffect, type FormEvent, type ReactNode } from "react";
import { handleEnterKey } from "@/lib/enter-submit";

// Montado uma vez na raiz: Enter salva qualquer <form> da plataforma.
export function EnterToSubmit() {
  useEffect(() => {
    document.addEventListener("keydown", handleEnterKey);
    return () => document.removeEventListener("keydown", handleEnterKey);
  }, []);
  return null;
}

// Formulário de diálogo: Enter (ou o botão type="submit") chama onSubmit uma
// única vez; enquanto pending, novos envios são ignorados. Botões que não
// salvam precisam de type="button".
export function SubmitForm({
  onSubmit,
  pending = false,
  children,
  className = "grid gap-4",
}: {
  onSubmit: () => void;
  pending?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      aria-busy={pending || undefined}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!pending) onSubmit();
      }}
    >
      {children}
    </form>
  );
}

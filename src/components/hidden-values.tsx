import type { ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { HiddenValuesContext, setValuesHidden, useStoredValuesHidden } from "@/lib/hidden-values";
import { Button } from "@/components/ui/button";

/** Liga a ocultação de valores para o conteúdo de dentro (Painel e Financeiro). */
export function HideValuesScope({ children }: { children: ReactNode }) {
  const hidden = useStoredValuesHidden();
  return <HiddenValuesContext.Provider value={hidden}>{children}</HiddenValuesContext.Provider>;
}

/** Olhinho: aberto mostra os valores, fechado oculta. */
export function HideValuesToggle({ className }: { className?: string } = {}) {
  const hidden = useStoredValuesHidden();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
      title={hidden ? "Mostrar valores" : "Ocultar valores"}
      onClick={() => setValuesHidden(!hidden)}
    >
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}

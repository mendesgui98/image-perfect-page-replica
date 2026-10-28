import { useState } from "react";
import { Input } from "@/components/ui/input";
import { maskBRL, moneyText, parseBRL } from "@/lib/money";

/** Campo em reais: mostra "R$ 10.000,00" enquanto digita. Com `name`, vai no FormData como
 * texto (ler com parseBRL); com `onCommit`, avisa o valor ao sair do campo. */
export function MoneyInput({
  value,
  onCommit,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type"> & {
  value?: number | null | undefined;
  onCommit?: ((value: number) => void) | undefined;
}) {
  const [text, setText] = useState(moneyText(value));
  return (
    <Input
      {...props}
      className={`num ${className ?? ""}`}
      inputMode="numeric"
      placeholder={props.placeholder ?? "R$ 0,00"}
      value={text}
      onChange={(e) => setText(maskBRL(e.target.value))}
      onBlur={(e) => {
        props.onBlur?.(e);
        if (onCommit && parseBRL(text) !== (Number(value) || 0)) onCommit(parseBRL(text));
      }}
    />
  );
}

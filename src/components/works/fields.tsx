import { Input } from "@/components/ui/input";
import { capitalizeWordsProps } from "@/lib/text-case";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { openDocument } from "@/lib/work-data";
import { toast } from "sonner";
export const selectClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25";
export function Field({
  label,
  name,
  type = "text",
  value,
  required = false,
  capitalize = false,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number | null | undefined;
  required?: boolean;
  /** Nome/endereço: primeira letra de cada palavra maiúscula ao digitar. */
  capitalize?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <Label>{label}</Label>
      <Input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        {...(capitalize ? capitalizeWordsProps : {})}
      />
    </label>
  );
}
export function Memo({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string | null | undefined;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <Label>{label}</Label>
      <Textarea name={name} defaultValue={value ?? ""} rows={3} />
    </label>
  );
}
export function Attachment({ path }: { path?: string | null | undefined }) {
  return path ? (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => openDocument(path).catch((e) => toast.error(e.message))}
    >
      <Paperclip className="h-4 w-4" />
      Anexo
    </Button>
  ) : null;
}

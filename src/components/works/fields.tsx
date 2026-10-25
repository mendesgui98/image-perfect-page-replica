import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { openDocument } from "@/lib/work-data";
import { toast } from "sonner";
export const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
export function Field({
  label,
  name,
  type = "text",
  value,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number | null | undefined;
  required?: boolean;
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
      size="sm"
      variant="ghost"
      onClick={() => openDocument(path).catch((e) => toast.error(e.message))}
    >
      <Paperclip className="h-4 w-4" />
      Anexo
    </Button>
  ) : null;
}
export const text = (d: FormData, k: string) => String(d.get(k) ?? "").trim();
export const number = (d: FormData, k: string) => Number(d.get(k)) || 0;

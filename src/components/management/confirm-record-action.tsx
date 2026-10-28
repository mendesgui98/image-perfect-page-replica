import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function ConfirmRecordAction({
  name,
  description,
  onConfirm,
  label = "Excluir",
}: {
  name: string;
  description: string;
  onConfirm: () => Promise<void>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="sm"
        aria-label={`${label} ${name}`}
        onClick={() => {
          setConfirmation("");
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" />
        {label}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {label} {name}?
            </AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (confirmation !== "EXCLUIR" || busy) return;
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Não foi possível concluir a exclusão.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block space-y-2 text-sm">
              Digite EXCLUIR para confirmar
              <Input
                aria-label="Confirmação da exclusão"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={busy}
              />
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={busy || confirmation !== "EXCLUIR"}
              >
                {busy ? "Excluindo…" : "Confirmar exclusão"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

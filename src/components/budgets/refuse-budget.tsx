import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmitForm } from "@/components/enter-submit";
import { Input } from "@/components/ui/input";
import { selectClass } from "@/components/works/fields";
import { REFUSAL_REASONS } from "@/lib/business-indicators";

// "Marcar como recusado" pede o motivo (funil comercial, roteiro R2-2). "Outro" aceita um texto.
export function RefuseBudget({ onRefuse }: { onRefuse: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REFUSAL_REASONS[0]);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="danger" onClick={() => setOpen(true)}>
        Marcar como recusado
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <SubmitForm
            pending={busy}
            onSubmit={async () => {
              setBusy(true);
              try {
                await onRefuse(reason === "Outro" ? other.trim() || "Outro" : reason);
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Por que o cliente recusou?</DialogTitle>
            </DialogHeader>
            <label className="grid gap-1 text-sm">
              Motivo
              <select
                className={selectClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {REFUSAL_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            {reason === "Outro" && (
              <label className="grid gap-1 text-sm">
                Qual?
                <Input value={other} onChange={(e) => setOther(e.target.value)} maxLength={120} />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              O motivo entra no funil comercial do Painel. O orçamento recusado fica bloqueado.
            </p>
            <DialogFooter>
              <Button type="submit" variant="danger" disabled={busy}>
                Marcar como recusado
              </Button>
            </DialogFooter>
          </SubmitForm>
        </DialogContent>
      </Dialog>
    </>
  );
}

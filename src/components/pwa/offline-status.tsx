import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { flushPendingRecords } from "@/lib/offline-records";
import { usePendingRecords } from "@/hooks/use-pending-records";

const RETRY_MS = 60_000;

/** Faixa de status de conexão e envio dos registros guardados no aparelho. */
export function OfflineStatus() {
  const qc = useQueryClient();
  const pending = usePendingRecords();
  const [online, setOnline] = useState(true);
  const [sending, setSending] = useState(false);

  async function flush(manual = false) {
    setSending(true);
    try {
      const r = await flushPendingRecords();
      if (r.sent) {
        toast.success(
          r.sent === 1 ? "1 registro enviado ao servidor." : `${r.sent} registros enviados.`,
        );
        qc.invalidateQueries();
      }
      if (r.failed) toast.error("Alguns registros foram recusados pelo servidor. Revise a fila.");
      if (manual && r.offline) toast.info("Ainda sem conexão. Tentaremos de novo automaticamente.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      void flush();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    void flush();
    const timer = window.setInterval(() => navigator.onLine && void flush(), RETRY_MS);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (online && pending.length === 0) return null;
  const withError = pending.filter((p) => p.lastError).length;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-warning-foreground"
    >
      <CloudOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {!online && "Sem internet. "}
        {pending.length > 0
          ? `${pending.length} registro(s) guardado(s) no aparelho aguardando envio${withError ? `, ${withError} com erro` : ""}.`
          : "Novos registros do diário serão guardados no aparelho."}
      </span>
      {online && pending.length > 0 && (
        <Button size="sm" variant="outline" disabled={sending} onClick={() => flush(true)}>
          <RefreshCw className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
          Enviar agora
        </Button>
      )}
    </div>
  );
}

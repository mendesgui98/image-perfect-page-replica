import { useRecordFocus } from "@/hooks/use-record-focus";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Field, Memo, Attachment, selectClass } from "./fields";
import { text } from "@/lib/form-values";
import { uploadDocument } from "@/lib/work-data";
import { compressImage } from "@/lib/image-compress";
import { isNetworkError } from "@/lib/offline-queue";
import { enqueueRecord, type PendingRecord } from "@/lib/offline-records";
import { usePendingRecords } from "@/hooks/use-pending-records";
import { fmtDate } from "@/lib/format";
import { Plus, Pencil } from "lucide-react";
type RecordRow = Database["public"]["Tables"]["work_records"]["Row"];
const labels: Record<string, string> = {
  diario: "Diário de obra",
  entrega: "Checklist de entrega",
  assistencia: "Assistência",
  decisao: "Decisões do cliente",
  documento: "Documentos",
};
export function Records({
  workId,
  kind,
  records,
  onChange,
}: {
  workId: string;
  kind: string;
  records: RecordRow[];
  onChange: () => void;
}) {
  const selectedRecord = useRecordFocus(records);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = usePendingRecords(workId).filter((p) => p.data.payload.kind === kind);

  function closeDialog() {
    setOpen(false);
    setEditing(null);
  }

  /** Guarda o registro no aparelho para envio automático quando a conexão voltar. */
  async function saveOffline(payload: PendingRecord["payload"], file: File | null) {
    const compressed = file ? await compressImage(file) : null;
    await enqueueRecord({
      payload,
      file: compressed ?? undefined,
      fileName: compressed?.name,
    });
    closeDialog();
    toast.info("Sem internet: registro guardado no aparelho e será enviado automaticamente.");
  }

  async function save(d: FormData) {
    setBusy(true);
    const f = d.get("file");
    const file = f instanceof File && f.size ? f : null;
    const fields = {
      work_id: workId,
      kind,
      title: text(d, "title"),
      record_date: text(d, "date"),
      body: text(d, "body"),
      team: text(d, "team"),
      next_steps: text(d, "next"),
      responsible: text(d, "responsible"),
      due_date: text(d, "due") || null,
      status: text(d, "status"),
      caption: text(d, "caption"),
    };
    // Id gerado no aparelho: permite reenviar sem duplicar.
    const newId = crypto.randomUUID();
    if (!editing && !navigator.onLine) {
      await saveOffline({ ...fields, id: newId, file_path: null }, file);
      setBusy(false);
      return;
    }
    let uploaded: string | null = null;
    try {
      if (file) uploaded = await uploadDocument(file, `records/${workId}`);
      const payload = { ...fields, file_path: uploaded ?? editing?.file_path ?? null };
      const r = editing
        ? await supabase.from("work_records").update(payload).eq("id", editing.id)
        : await supabase.from("work_records").insert({ ...payload, id: newId });
      if (r.error) throw r.error;
      closeDialog();
      onChange();
      toast.success("Registro salvo.");
    } catch (e) {
      if (!editing && isNetworkError(e)) {
        // Se o anexo já subiu, a fila envia só o registro.
        await saveOffline({ ...fields, id: newId, file_path: uploaded }, uploaded ? null : file);
      } else if (editing && isNetworkError(e)) {
        toast.error("Sem internet: a edição de registros existentes precisa de conexão.");
      } else {
        toast.error((e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{labels[kind]}</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo registro
        </Button>
      </div>
      <div className="divide-y">
        {pending.map((p) => (
          <article key={p.id} className="py-4 opacity-80">
            <h3 className="font-semibold">{p.data.payload.title}</h3>
            <p className="text-xs text-muted-foreground">
              {fmtDate(p.data.payload.record_date)} ·{" "}
              <span className={p.lastError ? "text-destructive" : "text-amber-700"}>
                {p.lastError
                  ? `Erro no envio: ${p.lastError}`
                  : "Guardado no aparelho, aguardando envio"}
              </span>
              {p.data.file || p.data.payload.file_path ? " · com anexo" : ""}
            </p>
            {p.data.payload.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm">{p.data.payload.body}</p>
            )}
          </article>
        ))}
        {records
          .filter((r) => r.kind === kind)
          .map((r) => (
            <article
              key={r.id}
              id={`record-${r.id}`}
              className={`scroll-mt-6 py-4 ${selectedRecord === r.id ? "border-l-4 border-primary bg-accent/40 pl-3" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(r.record_date)} · {r.responsible || "Sem responsável"} · {r.status}
                    {r.due_date ? ` · prazo ${fmtDate(r.due_date)}` : ""}
                  </p>
                </div>
                <Attachment path={r.file_path} />
                <Button
                  size="icon"
                  variant="ghost"
                  title="Editar registro"
                  aria-label={`Editar ${r.title}`}
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
              {r.team && <p className="mt-2 text-sm text-muted-foreground">Equipe: {r.team}</p>}
              {r.next_steps && <p className="mt-2 text-sm">Próximos passos: {r.next_steps}</p>}
              {r.caption && <p className="text-xs text-muted-foreground">{r.caption}</p>}
            </article>
          ))}
        {!records.some((r) => r.kind === kind) && pending.length === 0 && (
          <p className="py-6 text-sm text-muted-foreground">Nenhum registro.</p>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar registro" : labels[kind]}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save(new FormData(e.currentTarget));
            }}
          >
            <Field name="title" label="Título / atividade" required value={editing?.title} />
            <div className="grid grid-cols-2 gap-3">
              <Field name="date" type="date" label="Data" required value={editing?.record_date} />
              <Field
                name="due"
                type="date"
                label={kind === "assistencia" ? "Visita / prazo" : "Prazo / vencimento"}
                value={editing?.due_date}
              />
            </div>
            <Field name="responsible" label="Responsável" value={editing?.responsible} />
            <Memo name="body" label="Atividades, ocorrências e pendências" value={editing?.body} />
            {kind === "diario" && (
              <Field name="team" label="Equipe presente" value={editing?.team} />
            )}
            <Memo name="next" label="Próximos passos / resolução" value={editing?.next_steps} />
            <label className="text-sm">
              Situação
              <select
                name="status"
                className={selectClass}
                defaultValue={editing?.status ?? "pendente"}
              >
                <option value="pendente">Pendente</option>
                <option value="andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="aceito">Aceito pelo cliente</option>
              </select>
            </label>
            <Field name="file" label="Foto ou documento" type="file" />
            <Field name="caption" label="Legenda do anexo" value={editing?.caption} />
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Salvar registro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

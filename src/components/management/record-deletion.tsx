import { recordDeletionErrorMessage } from "@/lib/record-deletion-errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmRecordAction } from "./confirm-record-action";
import { fmtDate } from "@/lib/format";

export type DeletableEntity = "budgets" | "contracts" | "schedules" | "people";
const names: Record<DeletableEntity, string> = {
  budgets: "orçamento",
  contracts: "contrato",
  schedules: "cronograma",
  people: "cadastro",
};
function useDeletion() {
  const qc = useQueryClient();
  return async (entity: DeletableEntity, id: string, action: "trash" | "restore" | "permanent") => {
    const result = await supabase.rpc("manage_record_deletion", {
      _entity: entity,
      _id: id,
      _action: action,
    });
    if (result.error) throw new Error(recordDeletionErrorMessage(result.error));
    await qc.invalidateQueries();
    toast.success(
      action === "restore"
        ? "Registro restaurado."
        : action === "trash"
          ? "Registro enviado para a lixeira."
          : "Registro excluído definitivamente.",
    );
  };
}
export function RecordDeleteButton({
  entity,
  id,
  name,
  onDeleted,
}: {
  entity: DeletableEntity;
  id: string;
  name: string;
  onDeleted?: () => void;
}) {
  const { data: me } = useMe();
  const manage = useDeletion();
  if (!me?.isAdmin) return null;
  return (
    <ConfirmRecordAction
      name={name}
      description={`Este ${names[entity]} será retirado das listas e enviado para a lixeira. Você poderá restaurar ou excluir definitivamente pela lixeira. Obras, financeiro e outros registros vinculados serão mantidos.${entity === "schedules" ? " As etapas e o avanço já registrados na obra permanecem disponíveis nela." : ""}`}
      onConfirm={async () => {
        await manage(entity, id, "trash");
        onDeleted?.();
      }}
    />
  );
}
export function DeletedRecordNotice({
  entity,
  id,
  name,
}: {
  entity: DeletableEntity;
  id: string;
  name: string;
}) {
  const { data: me } = useMe();
  const manage = useDeletion();
  const [busy, setBusy] = useState(false);
  return (
    <section className="space-y-4 rounded-lg border p-5">
      <h2 className="font-semibold">{name} está na lixeira</h2>
      <p className="text-sm text-muted-foreground">
        Restaure para voltar a editar. Os registros vinculados continuam preservados.
      </p>
      {me?.isAdmin && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await manage(entity, id, "restore");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar
        </Button>
      )}
    </section>
  );
}
export function RecordTrash({ entity }: { entity: DeletableEntity }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const manage = useDeletion();
  const { data, error, isPending } = useQuery({
    queryKey: ["record-trash", entity],
    enabled: open && !!me?.isAdmin,
    queryFn: async () => {
      const r = await supabase
        .from(entity)
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (r.error) throw r.error;
      const w =
        entity === "contracts" ? await supabase.from("work_registry").select("id,name") : null;
      if (w?.error) throw w.error;
      return r.data.map((row) => {
        const record = row as {
          id: string;
          name?: string;
          title?: string;
          number?: number;
          revision?: number;
          work_id?: string;
          deleted_at: string | null;
        };
        const name =
          entity === "budgets"
            ? `Orçamento nº ${record.number}${record.revision ? ` · Rev. ${record.revision}` : ""} · ${record.title}`
            : entity === "contracts"
              ? `Contrato · ${w?.data?.find((work) => work.id === record.work_id)?.name || "Obra"}`
              : record.name || names[entity];
        return { id: record.id, name, deleted_at: record.deleted_at };
      });
    },
  });
  if (!me?.isAdmin) return null;
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Lixeira
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lixeira · {names[entity]}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Restaure um registro ou exclua definitivamente. A exclusão definitiva é bloqueada quando
            outros registros dependem dele. O histórico de auditoria é mantido.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {recordDeletionErrorMessage(error)}
            </p>
          )}
          {isPending && !error && <p>Carregando lixeira…</p>}
          <div className="divide-y">
            {data?.map((row) => (
              <article
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <h3 className="break-words font-medium">{row.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Excluído em {fmtDate(row.deleted_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={async () => {
                      setBusy(row.id);
                      try {
                        await manage(entity, row.id, "restore");
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar
                  </Button>
                  <ConfirmRecordAction
                    name={row.name}
                    label="Excluir definitivamente"
                    description={`Esta ação não pode ser desfeita. O registro será removido, e o histórico de auditoria será mantido. Se houver vínculos que impeçam a exclusão, nada será removido e o motivo será informado.${entity === "schedules" ? " As etapas e o avanço da obra serão preservados." : ""}`}
                    onConfirm={() => manage(entity, row.id, "permanent")}
                  />
                </div>
              </article>
            ))}
            {data?.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">A lixeira está vazia.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

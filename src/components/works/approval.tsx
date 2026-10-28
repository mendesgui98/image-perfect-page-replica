import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, HardHat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convertBudgetToWork, syncBudgetStages } from "@/lib/work-budget";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Attachment } from "./fields";
import { text } from "@/lib/form-values";
import { uploadDocument } from "@/lib/work-data";
export function Approval({
  budgetId,
  status,
  onChange,
}: {
  budgetId: string;
  status: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: work } = useQuery({
    queryKey: ["budget-work", budgetId],
    queryFn: async () => {
      const r = await supabase
        .from("work_registry")
        .select("id")
        .eq("linked_budget_id", budgetId)
        .maybeSingle();
      if (r.error) throw r.error;
      return r.data;
    },
  });
  const approve = useMutation({
    mutationFn: async (d: FormData) => {
      const file = d.get("proof");
      if (!(file instanceof File) || !file.size) throw Error("Anexe o comprovante da aprovação.");
      const path = await uploadDocument(file, "approvals");
      const r = await supabase
        .from("budgets")
        .update({ status: "aprovado", approval_date: text(d, "date"), approval_path: path })
        .eq("id", budgetId);
      if (r.error) throw r.error;
      const h = await supabase.from("budget_history").insert({
        budget_id: budgetId,
        action: "aprovado",
        summary: { approval_date: text(d, "date"), path },
      });
      if (h.error) throw h.error;
      // Revisão que substituiu a anterior: a obra já foi religada; atualiza os serviços das etapas.
      try {
        return { workId: await syncBudgetStages(budgetId) };
      } catch (e) {
        return { syncError: (e as Error).message };
      }
    },
    onSuccess: (r) => {
      setOpen(false);
      onChange();
      qc.invalidateQueries({ queryKey: ["stage-services"] });
      toast.success(
        r.workId
          ? "Aprovação registrada. A obra e as etapas passaram para esta versão."
          : "Aprovação registrada.",
      );
      if (r.syncError) toast.error(`Etapas da obra não atualizadas: ${r.syncError}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const convert = useMutation({
    mutationFn: async () => {
      return convertBudgetToWork(budgetId);
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["works"] });
      navigate({ to: "/obras/$id", params: { id } });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      {["elaboracao", "enviado"].includes(status) && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Check className="h-4 w-4" />
          Registrar aprovação
        </Button>
      )}
      {status === "aprovado" &&
        (work ? (
          <Button size="sm" asChild>
            <Link to="/obras/$id" params={{ id: work.id }}>
              <HardHat className="h-4 w-4" />
              Abrir obra
            </Link>
          </Button>
        ) : (
          <Button size="sm" disabled={convert.isPending} onClick={() => convert.mutate()}>
            <HardHat className="h-4 w-4" />
            Converter em obra
          </Button>
        ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar versão aprovada</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              approve.mutate(new FormData(e.currentTarget));
            }}
          >
            <Field name="date" label="Data da aprovação" type="date" required />
            <Field name="proof" label="Comprovante da aprovação" type="file" required />
            <Button disabled={approve.isPending} type="submit">
              {approve.isPending ? "Registrando…" : "Confirmar aprovação"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

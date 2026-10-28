-- Versões salvas do orçamento: cada "Salvar versão" guarda o PDF oficial gerado naquele momento
-- (bucket privado jmg-documents, pasta budget-versions/) com o total e uma impressão digital do
-- conteúdo. Enquanto o orçamento não é aprovado pode haver quantas versões forem precisas; ao
-- aprovar, a última versão salva é marcada como a aprovada. Versões nunca são editadas.

CREATE TABLE public.budget_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  version integer NOT NULL,
  file_path text NOT NULL,
  total numeric NOT NULL,
  -- Resumo do conteúdo (itens, etapas, preço e condições) para saber se mudou desde a versão.
  fingerprint text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (budget_id, version)
);
CREATE INDEX budget_versions_budget_idx ON public.budget_versions(budget_id, version);
GRANT SELECT, INSERT ON public.budget_versions TO authenticated;
GRANT ALL ON public.budget_versions TO service_role;
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
-- Orçamento é dado de preço: só admin/financeiro.
CREATE POLICY budget_versions_read ON public.budget_versions FOR SELECT TO authenticated
  USING (public.can_see_costs(auth.uid()));
CREATE POLICY budget_versions_insert ON public.budget_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_see_costs(auth.uid()));

-- Nova versão: número sequencial do banco, só com o orçamento ainda editável e o PDF existindo.
CREATE FUNCTION public.guard_budget_version() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE st public.budget_status; gone timestamptz;
BEGIN
 SELECT status, deleted_at INTO st, gone FROM public.budgets WHERE id=new.budget_id FOR UPDATE;
 IF NOT FOUND OR gone IS NOT NULL THEN RAISE EXCEPTION 'Orçamento não encontrado.'; END IF;
 IF st IN ('aprovado','recusado','substituido','cancelado') THEN
   RAISE EXCEPTION 'Orçamento fechado: não recebe novas versões.';
 END IF;
 IF NOT public.evidence_exists(new.file_path,'budget-versions') THEN
   RAISE EXCEPTION 'PDF da versão não encontrado.';
 END IF;
 SELECT coalesce(max(version),0)+1 INTO new.version FROM public.budget_versions WHERE budget_id=new.budget_id;
 new.approved := false;
 new.created_by := auth.uid();
 new.created_at := now();
 RETURN new;
END $$;
CREATE TRIGGER budget_versions_guard BEFORE INSERT ON public.budget_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_budget_version();

-- Aprovação: a última versão salva passa a ser a aprovada.
CREATE FUNCTION public.mark_approved_budget_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.budget_versions SET approved=true
  WHERE id=(SELECT id FROM public.budget_versions WHERE budget_id=new.id ORDER BY version DESC LIMIT 1);
 RETURN new;
END $$;
CREATE TRIGGER budgets_mark_approved_version AFTER UPDATE OF status ON public.budgets
  FOR EACH ROW WHEN (new.status='aprovado' AND old.status IS DISTINCT FROM 'aprovado')
  EXECUTE FUNCTION public.mark_approved_budget_version();

NOTIFY pgrst, 'reload schema';

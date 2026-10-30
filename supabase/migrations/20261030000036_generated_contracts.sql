-- Contrato gerado pelo modelo oficial (POST /v1/orcamentos/:id/contrato) passa a ser registrado em
-- contracts, aparecendo no menu Contratos com situação: aguardando revisão, aguardando assinatura
-- ou assinado (com o documento assinado guardado no bucket privado).
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS budget_id uuid REFERENCES public.budgets(id),
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS generated_path text,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts DISABLE TRIGGER USER;
UPDATE public.contracts SET status = CASE status WHEN 'rascunho' THEN 'aguardando_revisao' WHEN 'gerado' THEN 'aguardando_assinatura' ELSE status END
  WHERE status IN ('rascunho','gerado');
ALTER TABLE public.contracts ENABLE TRIGGER USER;
ALTER TABLE public.contracts ALTER COLUMN status SET DEFAULT 'aguardando_revisao';
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('aguardando_revisao','aguardando_assinatura','assinado'));

-- Texto completo só é exigido para contratos de texto; o gerado pelo modelo traz o PDF.
CREATE OR REPLACE FUNCTION public.guard_contract() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' AND coalesce(current_setting('jmg.record_delete',true),'') IN ('trash','restore') AND public.has_role(auth.uid(),'admin')
     AND (to_jsonb(new)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) IS NOT DISTINCT FROM (to_jsonb(old)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) THEN
    RETURN new;
  END IF;
  IF TG_OP='UPDATE' AND old.status='assinado' THEN RAISE EXCEPTION 'Contrato assinado preservado. Registre um aditivo.'; END IF;
  IF new.status IN ('aguardando_assinatura','assinado') AND new.generated_path IS NULL
     AND (nullif(trim(new.body),'') IS NULL OR new.body ~ '\{\{[^}]+\}\}') THEN
    RAISE EXCEPTION 'Preencha todos os dados do contrato.';
  END IF;
  IF new.generated_path IS NOT NULL AND NOT public.evidence_exists(new.generated_path,'contracts') THEN
    RAISE EXCEPTION 'PDF do contrato não encontrado.';
  END IF;
  IF new.status='assinado' AND (new.signed_date IS NULL OR NOT public.evidence_exists(new.signed_path,'contracts')) THEN
    RAISE EXCEPTION 'Anexe o contrato assinado e a data.';
  END IF;
  RETURN new;
END $$;

-- Registra (ou atualiza) o contrato da obra do orçamento aprovado com o PDF recém-gerado. Contrato
-- novo entra "aguardando assinatura"; um já existente mantém a situação escolhida e ganha o PDF novo;
-- assinado não muda. Sem obra convertida devolve null (o contrato entra quando a obra existir).
CREATE OR REPLACE FUNCTION public.register_generated_contract(_budget_id uuid, _path text, _code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE wid uuid; cid uuid; st text;
BEGIN
  IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.budgets WHERE id=_budget_id AND status='aprovado') THEN
    RAISE EXCEPTION 'O contrato só é gerado para orçamento aprovado.';
  END IF;
  SELECT id INTO wid FROM public.work_registry WHERE linked_budget_id=_budget_id AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF wid IS NULL THEN RETURN NULL; END IF;
  SELECT id, status INTO cid, st FROM public.contracts WHERE work_id=wid FOR UPDATE;
  IF st='assinado' THEN RETURN cid; END IF;
  IF cid IS NULL THEN
    INSERT INTO public.contracts(work_id,budget_id,code,generated_path,generated_at,status,created_by)
    VALUES(wid,_budget_id,_code,_path,now(),'aguardando_assinatura',auth.uid()) RETURNING id INTO cid;
  ELSE
    UPDATE public.contracts SET budget_id=_budget_id, code=_code, generated_path=_path, generated_at=now(),
      deleted_at=NULL, deleted_by=NULL
    WHERE id=cid;
  END IF;
  RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.register_generated_contract(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_generated_contract(uuid,text,text) TO authenticated;

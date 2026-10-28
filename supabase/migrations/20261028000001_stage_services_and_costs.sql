-- Serviços dentro de cada etapa da obra, com valor previsto (mão de obra e material) e avanço.
-- Exclusão definitiva da obra (manage_record_deletion) leva os serviços junto pela cascata.
-- O avanço da etapa é a média dos serviços ponderada pelo valor (calculado em work-progress.ts e
-- gravado em work_stages.progress). O gasto real da etapa vem do financeiro: saídas com stage_id.

CREATE TABLE public.work_stage_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.work_registry(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.work_stages(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (nullif(trim(description),'') IS NOT NULL),
  labor_planned numeric NOT NULL DEFAULT 0 CHECK (labor_planned >= 0),
  material_planned numeric NOT NULL DEFAULT 0 CHECK (material_planned >= 0),
  progress numeric NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  sort integer NOT NULL DEFAULT 0,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_stage_services_stage_idx ON public.work_stage_services(stage_id, sort);
CREATE INDEX work_stage_services_work_idx ON public.work_stage_services(work_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_stage_services TO authenticated;
GRANT ALL ON public.work_stage_services TO service_role;
ALTER TABLE public.work_stage_services ENABLE ROW LEVEL SECURITY;
-- Valores previstos são dados de custo: só admin/financeiro.
CREATE POLICY stage_services_access ON public.work_stage_services FOR ALL TO authenticated
  USING (public.can_see_costs(auth.uid())) WITH CHECK (public.can_see_costs(auth.uid()));
CREATE TRIGGER work_stage_services_audit BEFORE INSERT OR UPDATE ON public.work_stage_services
  FOR EACH ROW EXECUTE FUNCTION public.touch_audit();

-- Serviço pertence a uma etapa ativa da mesma obra.
CREATE FUNCTION public.guard_stage_service() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.work_stages WHERE id=new.stage_id AND work_id=new.work_id AND NOT removed) THEN
   RAISE EXCEPTION 'Serviço deve pertencer a uma etapa ativa da obra.';
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER work_stage_services_guard BEFORE INSERT OR UPDATE ON public.work_stage_services
  FOR EACH ROW EXECUTE FUNCTION public.guard_stage_service();

-- Auditoria em work_history (inclusive exclusão, com o valor anterior).
CREATE FUNCTION public.log_stage_service_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.work_history(work_id,entity,entity_id,before,after)
 VALUES(coalesce(new.work_id,old.work_id),'work_stage_services',coalesce(new.id,old.id),
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(old) END,
   CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(new) END);
 RETURN coalesce(new,old);
END $$;
CREATE TRIGGER work_stage_services_history AFTER INSERT OR UPDATE OR DELETE ON public.work_stage_services
  FOR EACH ROW EXECUTE FUNCTION public.log_stage_service_change();

-- Lançamento financeiro só aponta para etapa da mesma obra.
CREATE FUNCTION public.guard_entry_stage() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF new.stage_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.work_stages WHERE id=new.stage_id AND work_id=new.work_id) THEN
   RAISE EXCEPTION 'A etapa precisa ser da mesma obra do lançamento.';
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER entry_stage_guard BEFORE INSERT OR UPDATE OF stage_id, work_id ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_entry_stage();

-- Parcelas continuam imutáveis, mas a etapa pode ser escolhida ou trocada depois.
CREATE OR REPLACE FUNCTION public.guard_installment_entry() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE o public.purchase_orders; g public.financial_groups; allocated numeric; ignored text[]; BEGIN
 IF new.payable_order_id IS NOT NULL THEN
   SELECT * INTO o FROM public.purchase_orders WHERE id=new.payable_order_id;
   IF NOT FOUND OR new.direction<>'saida' OR new.work_id IS DISTINCT FROM o.work_id OR new.purchase_order_id IS NOT NULL THEN RAISE EXCEPTION 'Parcela de compra inválida.'; END IF;
 END IF;
 IF new.group_id IS NOT NULL THEN
   SELECT * INTO g FROM public.financial_groups WHERE id=new.group_id FOR UPDATE;
   IF NOT FOUND OR new.work_id IS DISTINCT FROM g.work_id THEN RAISE EXCEPTION 'Grupo de parcelas inválido.'; END IF;
   SELECT coalesce(sum(amount),0) INTO allocated FROM public.financial_entries WHERE group_id=g.id AND id<>new.id AND NOT canceled;
   IF NOT new.canceled AND allocated+new.amount>g.total THEN RAISE EXCEPTION 'Parcelas excedem o valor total.'; END IF;
 END IF;
 ignored:=ARRAY['incurred','stage_id','updated_at','updated_by'];
 IF coalesce(current_setting('jmg.finance_cancel',true),'')='on' THEN ignored:=ignored||'canceled'::text; END IF;
 IF TG_OP='UPDATE' AND (old.group_id IS NOT NULL OR old.payable_order_id IS NOT NULL) AND (to_jsonb(new)-ignored) IS DISTINCT FROM (to_jsonb(old)-ignored) THEN
   RAISE EXCEPTION 'Parcelas preservadas; baixas são registradas separadamente.';
 END IF;
 RETURN new;
END $$;

NOTIFY pgrst, 'reload schema';

-- Valor previsto digitado direto na etapa (obra feita do zero): mão de obra/serviço e materiais.
-- Quando a etapa tem serviços (work_stage_services), o previsto passa a ser a soma deles e estes
-- valores ficam guardados sem entrar na conta (regra em stageCosts, operations.ts).
-- Fica fora de work_stages porque a equipe lê etapas e valores previstos são dados de custo.

CREATE TABLE public.work_stage_values (
  stage_id uuid PRIMARY KEY REFERENCES public.work_stages(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.work_registry(id) ON DELETE CASCADE,
  labor_planned numeric NOT NULL DEFAULT 0 CHECK (labor_planned >= 0),
  material_planned numeric NOT NULL DEFAULT 0 CHECK (material_planned >= 0),
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_stage_values_work_idx ON public.work_stage_values(work_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_stage_values TO authenticated;
GRANT ALL ON public.work_stage_values TO service_role;
ALTER TABLE public.work_stage_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_values_access ON public.work_stage_values FOR ALL TO authenticated
  USING (public.can_see_costs(auth.uid())) WITH CHECK (public.can_see_costs(auth.uid()));
CREATE TRIGGER work_stage_values_audit BEFORE INSERT OR UPDATE ON public.work_stage_values
  FOR EACH ROW EXECUTE FUNCTION public.touch_audit();

-- Valor pertence a uma etapa ativa da mesma obra.
CREATE FUNCTION public.guard_stage_value() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.work_stages WHERE id=new.stage_id AND work_id=new.work_id AND NOT removed) THEN
   RAISE EXCEPTION 'Valor deve pertencer a uma etapa ativa da obra.';
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER work_stage_values_guard BEFORE INSERT OR UPDATE ON public.work_stage_values
  FOR EACH ROW EXECUTE FUNCTION public.guard_stage_value();

-- Auditoria em work_history (inclusive exclusão, com o valor anterior).
CREATE FUNCTION public.log_stage_value_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.work_history(work_id,entity,entity_id,before,after)
 VALUES(coalesce(new.work_id,old.work_id),'work_stage_values',coalesce(new.stage_id,old.stage_id),
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(old) END,
   CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(new) END);
 RETURN coalesce(new,old);
END $$;
CREATE TRIGGER work_stage_values_history AFTER INSERT OR UPDATE OR DELETE ON public.work_stage_values
  FOR EACH ROW EXECUTE FUNCTION public.log_stage_value_change();

NOTIFY pgrst, 'reload schema';

-- Entregas de material do cliente na obra (aba "Materiais do cliente" do cronograma).
-- Cada linha é um material que o cliente precisa entregar na obra até uma data, ligado à etapa
-- que depende dele. O cronograma físico-financeiro mostra essas entregas na folha do período.
-- Registro operacional: mesma regra das etapas (admin/financeiro e equipe), sem valores.

CREATE TABLE public.work_client_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.work_registry(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.work_stages(id) ON DELETE SET NULL,
  description text NOT NULL CHECK (nullif(trim(description),'') IS NOT NULL),
  due_date date NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  note text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_client_materials_work_idx ON public.work_client_materials(work_id, due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_client_materials TO authenticated;
GRANT ALL ON public.work_client_materials TO service_role;
ALTER TABLE public.work_client_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_materials_access ON public.work_client_materials FOR ALL TO authenticated
  USING (public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'))
  WITH CHECK (public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));
CREATE TRIGGER work_client_materials_audit BEFORE INSERT OR UPDATE ON public.work_client_materials
  FOR EACH ROW EXECUTE FUNCTION public.touch_audit();

-- A etapa, quando informada, é uma etapa ativa da mesma obra.
CREATE FUNCTION public.guard_client_material() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF new.stage_id IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM public.work_stages WHERE id=new.stage_id AND work_id=new.work_id AND NOT removed) THEN
   RAISE EXCEPTION 'A etapa do material deve ser uma etapa ativa da obra.';
 END IF;
 IF TG_OP='UPDATE' AND new.work_id<>old.work_id THEN
   RAISE EXCEPTION 'O material não pode mudar de obra.';
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER work_client_materials_guard BEFORE INSERT OR UPDATE ON public.work_client_materials
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_material();

-- Auditoria em work_history, como etapas, serviços e checklist.
CREATE FUNCTION public.log_client_material_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.work_history(work_id,entity,entity_id,before,after)
 VALUES(coalesce(new.work_id,old.work_id),'work_client_materials',coalesce(new.id,old.id),
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(old) END,
   CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(new) END);
 RETURN coalesce(new,old);
END $$;
CREATE TRIGGER work_client_materials_history AFTER INSERT OR UPDATE OR DELETE ON public.work_client_materials
  FOR EACH ROW EXECUTE FUNCTION public.log_client_material_change();

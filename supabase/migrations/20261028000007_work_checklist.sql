-- Checklist de conferência da obra, por etapa.
-- Cada serviço da etapa (work_stage_services) vira um item automaticamente (trigger abaixo),
-- guardando só a descrição: a equipe de campo confere sem enxergar valores de custo.
-- A equipe também pode incluir itens avulsos na etapa. Marcar um item não altera o avanço
-- da etapa nem o financeiro; quem e quando marcou são gravados pelo banco.

CREATE TABLE public.work_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.work_registry(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.work_stages(id) ON DELETE CASCADE,
  -- Item gerado de um serviço da etapa; nulo para item avulso. Excluir o serviço exclui o item.
  service_id uuid UNIQUE REFERENCES public.work_stage_services(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (nullif(trim(description),'') IS NOT NULL),
  sort integer NOT NULL DEFAULT 0,
  checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  checked_by uuid,
  note text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_checklist_items_stage_idx ON public.work_checklist_items(stage_id, sort);
CREATE INDEX work_checklist_items_work_idx ON public.work_checklist_items(work_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_checklist_items TO authenticated;
GRANT ALL ON public.work_checklist_items TO service_role;
ALTER TABLE public.work_checklist_items ENABLE ROW LEVEL SECURITY;
-- Registro operacional: mesma regra das etapas (admin/financeiro e equipe).
CREATE POLICY checklist_access ON public.work_checklist_items FOR ALL TO authenticated
  USING (public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'))
  WITH CHECK (public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));
CREATE TRIGGER work_checklist_items_audit BEFORE INSERT OR UPDATE ON public.work_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_audit();

-- Etapa ativa da mesma obra; quem/quando marcou vem do banco; itens de serviço só mudam
-- descrição/etapa pela sincronização (o texto acompanha o serviço) e só somem com ele.
CREATE FUNCTION public.guard_checklist_item() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE syncing boolean := coalesce(current_setting('jmg.checklist_sync',true),'')='on';
BEGIN
 IF TG_OP='DELETE' THEN
   IF old.service_id IS NOT NULL AND NOT syncing AND EXISTS(SELECT 1 FROM public.work_stage_services WHERE id=old.service_id) THEN
     RAISE EXCEPTION 'Item do serviço só sai do checklist quando o serviço é removido da etapa.';
   END IF;
   RETURN old;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.work_stages WHERE id=new.stage_id AND work_id=new.work_id AND NOT removed) THEN
   RAISE EXCEPTION 'Item do checklist deve pertencer a uma etapa ativa da obra.';
 END IF;
 IF TG_OP='INSERT' AND new.service_id IS NOT NULL AND NOT syncing THEN
   RAISE EXCEPTION 'Itens de serviço são criados automaticamente.';
 END IF;
 IF TG_OP='UPDATE' AND NOT syncing AND (new.service_id IS DISTINCT FROM old.service_id OR new.work_id<>old.work_id
    OR (old.service_id IS NOT NULL AND (new.description<>old.description OR new.stage_id<>old.stage_id))) THEN
   RAISE EXCEPTION 'Descrição e etapa do item seguem o serviço da etapa.';
 END IF;
 IF new.checked THEN
   IF TG_OP='INSERT' OR NOT old.checked THEN new.checked_at := now(); new.checked_by := auth.uid(); END IF;
 ELSE
   new.checked_at := NULL; new.checked_by := NULL;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER work_checklist_items_guard BEFORE INSERT OR UPDATE OR DELETE ON public.work_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_checklist_item();

-- Auditoria em work_history, como etapas e serviços.
CREATE FUNCTION public.log_checklist_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.work_history(work_id,entity,entity_id,before,after)
 VALUES(coalesce(new.work_id,old.work_id),'work_checklist_items',coalesce(new.id,old.id),
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(old) END,
   CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(new) END);
 RETURN coalesce(new,old);
END $$;
CREATE TRIGGER work_checklist_items_history AFTER INSERT OR UPDATE OR DELETE ON public.work_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.log_checklist_change();

-- Serviço da etapa → item do checklist (criação, troca de texto/etapa/ordem).
CREATE FUNCTION public.sync_checklist_from_service() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM set_config('jmg.checklist_sync','on',true);
 IF TG_OP='INSERT' THEN
   INSERT INTO public.work_checklist_items(work_id,stage_id,service_id,description,sort)
   VALUES(new.work_id,new.stage_id,new.id,new.description,new.sort);
 ELSIF new.description IS DISTINCT FROM old.description OR new.stage_id IS DISTINCT FROM old.stage_id
    OR new.sort IS DISTINCT FROM old.sort THEN
   UPDATE public.work_checklist_items SET description=new.description, stage_id=new.stage_id, sort=new.sort
    WHERE service_id=new.id;
 END IF;
 PERFORM set_config('jmg.checklist_sync','off',true);
 RETURN new;
END $$;
CREATE TRIGGER work_stage_services_checklist AFTER INSERT OR UPDATE ON public.work_stage_services
  FOR EACH ROW EXECUTE FUNCTION public.sync_checklist_from_service();

-- Serviços que já existiam.
SELECT set_config('jmg.checklist_sync','on',true);
INSERT INTO public.work_checklist_items(work_id,stage_id,service_id,description,sort)
SELECT s.work_id, s.stage_id, s.id, s.description, s.sort
  FROM public.work_stage_services s
  JOIN public.work_stages st ON st.id=s.stage_id AND NOT st.removed
 WHERE NOT EXISTS(SELECT 1 FROM public.work_checklist_items c WHERE c.service_id=s.id);
SELECT set_config('jmg.checklist_sync','off',true);

NOTIFY pgrst, 'reload schema';

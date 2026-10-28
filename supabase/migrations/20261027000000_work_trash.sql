-- Obras na lixeira (mesmo fluxo de orçamentos, contratos, cronogramas e cadastros).
-- Enviar para a lixeira tira a obra das listas e painéis e leva junto o cabeçalho do
-- cronograma vinculado; restaurar traz os dois de volta. Lançamentos, compras e demais
-- registros vinculados nunca são removidos: a exclusão definitiva só é permitida para
-- obra sem financeiro, compras, contratos, registros, extras ou estimativas.
ALTER TABLE public.work_registry ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid;
CREATE INDEX work_registry_deleted_idx ON public.work_registry(deleted_at);
CREATE TRIGGER work_registry_deletion_guard BEFORE INSERT OR UPDATE OR DELETE ON public.work_registry
  FOR EACH ROW EXECUTE FUNCTION public.guard_record_deletion();

CREATE OR REPLACE FUNCTION public.manage_record_deletion(_entity text,_id uuid,_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous jsonb; has_links boolean; links text[];
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente o administrador pode excluir ou restaurar registros.'; END IF;
 IF _entity NOT IN ('budgets','contracts','schedules','people','work_registry') OR _action NOT IN ('trash','restore','permanent') THEN RAISE EXCEPTION 'Operação inválida.'; END IF;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',_entity) INTO previous USING _id;
 IF previous IS NULL THEN RAISE EXCEPTION 'Registro não encontrado.'; END IF;
 IF _action='trash' AND previous->>'deleted_at' IS NOT NULL OR _action='restore' AND previous->>'deleted_at' IS NULL THEN RETURN; END IF;
 IF _action='permanent' AND previous->>'deleted_at' IS NULL THEN RAISE EXCEPTION 'Envie o registro para a lixeira antes da exclusão definitiva.'; END IF;
 PERFORM set_config('jmg.record_delete',_action,true);
 IF _action='permanent' THEN
   IF _entity='people' THEN
     SELECT EXISTS(SELECT 1 FROM public.budgets WHERE client_id=_id OR architect_id=_id)
       OR EXISTS(SELECT 1 FROM public.work_registry WHERE client_id=_id OR architect_id=_id)
       OR EXISTS(SELECT 1 FROM public.works WHERE client_id=_id OR architect_id=_id)
       OR EXISTS(SELECT 1 FROM public.schedules WHERE client_id=_id)
       OR EXISTS(SELECT 1 FROM public.purchase_orders WHERE supplier_id=_id)
       OR EXISTS(SELECT 1 FROM public.materials WHERE supplier_id=_id)
       OR EXISTS(SELECT 1 FROM public.financial_entries WHERE person_id=_id) INTO has_links;
     IF has_links THEN RAISE EXCEPTION 'Este cadastro possui vínculos com orçamentos, obras, cronogramas, compras, materiais ou financeiro. Ele pode permanecer na lixeira; remova os vínculos antes da exclusão definitiva.'; END IF;
   ELSIF _entity='budgets' THEN
     SELECT EXISTS(SELECT 1 FROM public.work_registry WHERE linked_budget_id=_id)
       OR EXISTS(SELECT 1 FROM public.works WHERE budget_id=_id)
       OR EXISTS(SELECT 1 FROM public.budgets WHERE parent_budget_id=_id)
       OR EXISTS(SELECT 1 FROM public.schedules WHERE budget_id=_id)
       OR EXISTS(SELECT 1 FROM public.work_stages s JOIN public.budget_sections bs ON bs.id=s.budget_section_id WHERE bs.budget_id=_id) INTO has_links;
     IF has_links THEN RAISE EXCEPTION 'Este orçamento possui vínculos com obras, cronogramas ou revisões. Ele pode permanecer na lixeira; remova os vínculos antes da exclusão definitiva.'; END IF;
     previous:=previous||jsonb_build_object('sections',(SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') FROM public.budget_sections s WHERE budget_id=_id),'items',(SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]') FROM public.budget_items i WHERE budget_id=_id),'history',(SELECT coalesce(jsonb_agg(to_jsonb(h)),'[]') FROM public.budget_history h WHERE budget_id=_id));
     DELETE FROM public.budget_items WHERE budget_id=_id;
     DELETE FROM public.budget_sections WHERE budget_id=_id;
   ELSIF _entity='schedules' THEN
     previous:=previous||jsonb_build_object('versions',(SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM public.schedule_versions v WHERE schedule_id=_id));
     DELETE FROM public.schedule_versions WHERE schedule_id=_id;
   ELSIF _entity='work_registry' THEN
     links:=array_remove(ARRAY[
       CASE WHEN EXISTS(SELECT 1 FROM public.financial_entries WHERE work_id=_id)
         OR EXISTS(SELECT 1 FROM public.expense_allocations WHERE work_id=_id)
         OR EXISTS(SELECT 1 FROM public.financial_groups WHERE work_id=_id) THEN 'lançamentos financeiros' END,
       CASE WHEN EXISTS(SELECT 1 FROM public.work_openings WHERE work_id=_id AND (received>0 OR paid>0 OR incurred>0 OR pending_payable>0)) THEN 'valores recebidos ou pagos antes do sistema' END,
       CASE WHEN EXISTS(SELECT 1 FROM public.purchase_orders WHERE work_id=_id)
         OR EXISTS(SELECT 1 FROM public.material_movements WHERE work_id=_id) THEN 'compras ou movimentação de materiais' END,
       CASE WHEN EXISTS(SELECT 1 FROM public.contracts WHERE work_id=_id) THEN 'contrato' END,
       CASE WHEN EXISTS(SELECT 1 FROM public.work_records WHERE work_id=_id) THEN 'registros do diário ou fotos' END,
       CASE WHEN EXISTS(SELECT 1 FROM public.work_extras WHERE work_id=_id)
         OR EXISTS(SELECT 1 FROM public.work_estimates WHERE work_id=_id) THEN 'extras ou estimativas' END
     ],NULL);
     IF cardinality(links)>0 THEN RAISE EXCEPTION 'Esta obra possui %. Ela pode permanecer na lixeira; a exclusão definitiva só é feita em obra sem esses vínculos.', array_to_string(links,', '); END IF;
     previous:=previous||jsonb_build_object(
       'opening',(SELECT to_jsonb(o) FROM public.work_openings o WHERE work_id=_id),
       'stages',(SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') FROM public.work_stages s WHERE work_id=_id),
       'schedule_versions',(SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM public.work_schedule_versions v WHERE work_id=_id),
       'schedules',(SELECT coalesce(jsonb_agg(to_jsonb(h)),'[]') FROM public.schedules h WHERE work_id=_id),
       'history',(SELECT coalesce(jsonb_agg(to_jsonb(h)),'[]') FROM public.work_history h WHERE work_id=_id));
     DELETE FROM public.schedule_versions WHERE schedule_id IN (SELECT id FROM public.schedules WHERE work_id=_id);
     DELETE FROM public.schedules WHERE work_id=_id;
     DELETE FROM public.work_schedule_versions WHERE work_id=_id;
     DELETE FROM public.work_stages WHERE work_id=_id;
     DELETE FROM public.work_openings WHERE work_id=_id;
     DELETE FROM public.work_history WHERE work_id=_id;
     DELETE FROM public.works WHERE id=_id;
   END IF;
   EXECUTE format('DELETE FROM public.%I WHERE id=$1',_entity) USING _id;
 ELSE
   EXECUTE format('UPDATE public.%I SET deleted_at=$2,deleted_by=$3 WHERE id=$1',_entity)
     USING _id,CASE WHEN _action='trash' THEN now() ELSE NULL::timestamptz END,CASE WHEN _action='trash' THEN auth.uid() ELSE NULL::uuid END;
   -- O cronograma da obra acompanha a obra: vai junto para a lixeira e volta junto
   -- (só o que foi levado por esta obra, identificado pelo mesmo horário).
   IF _entity='work_registry' THEN
     IF _action='trash' THEN
       UPDATE public.schedules SET deleted_at=now(),deleted_by=auth.uid() WHERE work_id=_id AND deleted_at IS NULL;
     ELSE
       UPDATE public.schedules SET deleted_at=NULL,deleted_by=NULL WHERE work_id=_id AND deleted_at=(previous->>'deleted_at')::timestamptz;
     END IF;
   END IF;
 END IF;
 INSERT INTO public.record_deletion_log(entity,record_id,action,snapshot) VALUES(_entity,_id,_action,previous);
 PERFORM set_config('jmg.record_delete','',true);
END $$;
REVOKE ALL ON FUNCTION public.manage_record_deletion(text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_record_deletion(text,uuid,text) TO authenticated;

NOTIFY pgrst, 'reload schema';

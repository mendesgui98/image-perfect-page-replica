-- Deletions are explicit administrator operations; references remain intact in the trash.
DO $$ DECLARE entity text; BEGIN
  FOREACH entity IN ARRAY ARRAY['budgets','contracts','schedules','people'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid',entity);
    EXECUTE format('CREATE INDEX %I ON public.%I(deleted_at)',entity||'_deleted_idx',entity);
  END LOOP;
END $$;
CREATE TABLE public.record_deletion_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text NOT NULL, record_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('trash','restore','permanent')), snapshot jsonb NOT NULL,
 changed_by uuid NOT NULL DEFAULT auth.uid(), changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.record_deletion_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.record_deletion_log TO authenticated; GRANT ALL ON public.record_deletion_log TO service_role;
CREATE POLICY deletion_log_admin ON public.record_deletion_log FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));

CREATE FUNCTION public.guard_record_deletion() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
   IF coalesce(current_setting('jmg.record_delete',true),'')<>'permanent' OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Use a exclusão definitiva na lixeira.'; END IF;
   RETURN old;
 END IF;
 IF TG_OP='INSERT' THEN
   IF new.deleted_at IS NOT NULL OR new.deleted_by IS NOT NULL THEN RAISE EXCEPTION 'Crie o registro fora da lixeira.'; END IF;
 ELSE
   IF (new.deleted_at,new.deleted_by) IS DISTINCT FROM (old.deleted_at,old.deleted_by) THEN
     IF coalesce(current_setting('jmg.record_delete',true),'') NOT IN ('trash','restore') OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Use a operação da lixeira.'; END IF;
   ELSIF old.deleted_at IS NOT NULL AND NOT (TG_TABLE_NAME='schedules' AND pg_trigger_depth()>1) AND coalesce(current_setting('jmg.record_delete',true),'') NOT IN ('trash','restore','permanent') THEN
     RAISE EXCEPTION 'Restaure o registro antes de editar.';
   END IF;
 END IF;
 RETURN new;
END $$;
DO $$ DECLARE entity text; BEGIN
 FOREACH entity IN ARRAY ARRAY['budgets','contracts','schedules','people'] LOOP
   EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_record_deletion()',entity||'_deletion_guard',entity);
 END LOOP;
END $$;

CREATE FUNCTION public.manage_record_deletion(_entity text,_id uuid,_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE previous jsonb; has_links boolean;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente o administrador pode excluir ou restaurar registros.'; END IF;
 IF _entity NOT IN ('budgets','contracts','schedules','people') OR _action NOT IN ('trash','restore','permanent') THEN RAISE EXCEPTION 'Operação inválida.'; END IF;
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
   END IF;
   EXECUTE format('DELETE FROM public.%I WHERE id=$1',_entity) USING _id;
 ELSE
   EXECUTE format('UPDATE public.%I SET deleted_at=$2,deleted_by=$3 WHERE id=$1',_entity)
     USING _id,CASE WHEN _action='trash' THEN now() ELSE NULL::timestamptz END,CASE WHEN _action='trash' THEN auth.uid() ELSE NULL::uuid END;
 END IF;
 INSERT INTO public.record_deletion_log(entity,record_id,action,snapshot) VALUES(_entity,_id,_action,previous);
 PERFORM set_config('jmg.record_delete','',true);
END $$;
REVOKE ALL ON FUNCTION public.manage_record_deletion(text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_record_deletion(text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_budget_locked() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE st public.budget_status; BEGIN IF coalesce(current_setting('jmg.record_delete',true),'')='permanent' AND public.has_role(auth.uid(),'admin') AND TG_OP='DELETE' THEN RETURN old; END IF; IF tg_table_name IN ('budget_sections','budget_items') THEN IF TG_OP<>'INSERT' THEN IF EXISTS(SELECT 1 FROM public.budgets WHERE id=old.budget_id AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Restaure o orçamento antes de editar seus itens.'; END IF; END IF; IF TG_OP<>'DELETE' THEN IF EXISTS(SELECT 1 FROM public.budgets WHERE id=new.budget_id AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Restaure o orçamento antes de editar seus itens.'; END IF; END IF; END IF; IF TG_OP='UPDATE' AND tg_table_name='budgets' AND coalesce(current_setting('jmg.record_delete',true),'') IN ('trash','restore') AND public.has_role(auth.uid(),'admin') AND (to_jsonb(new)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) IS NOT DISTINCT FROM (to_jsonb(old)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) THEN RETURN new; END IF; IF tg_table_name='budgets' THEN IF old.status IN ('aprovado','recusado') AND (to_jsonb(new)-ARRAY['archived','updated_at','updated_by']) IS DISTINCT FROM (to_jsonb(old)-ARRAY['archived','updated_at','updated_by']) THEN RAISE EXCEPTION 'Orçamento bloqueado. Crie uma revisão.'; END IF; IF new.status='aprovado' AND (new.approval_date IS NULL OR NOT public.evidence_exists(new.approval_path,'approvals')) THEN RAISE EXCEPTION 'Informe data e comprovante de aprovação válido.'; END IF; RETURN new; END IF; IF TG_OP<>'INSERT' THEN SELECT status INTO st FROM public.budgets WHERE id=old.budget_id; IF st IN ('aprovado','recusado') THEN RAISE EXCEPTION 'Orçamento bloqueado. Crie uma revisão.'; END IF; END IF; IF TG_OP<>'DELETE' THEN SELECT status INTO st FROM public.budgets WHERE id=new.budget_id; IF st IN ('aprovado','recusado') THEN RAISE EXCEPTION 'Orçamento bloqueado. Crie uma revisão.'; END IF; END IF; RETURN coalesce(new,old); END $$;

CREATE OR REPLACE FUNCTION public.guard_contract() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF TG_OP='UPDATE' AND coalesce(current_setting('jmg.record_delete',true),'') IN ('trash','restore') AND public.has_role(auth.uid(),'admin') AND (to_jsonb(new)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) IS NOT DISTINCT FROM (to_jsonb(old)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) THEN RETURN new; END IF; IF TG_OP='UPDATE' AND old.status='assinado' THEN RAISE EXCEPTION 'Contrato assinado preservado. Registre um aditivo.'; END IF; IF new.status IN ('gerado','assinado') AND (nullif(trim(new.body),'') IS NULL OR new.body ~ '\{\{[^}]+\}\}') THEN RAISE EXCEPTION 'Preencha todos os dados do contrato.'; END IF; IF new.status='assinado' AND (new.signed_date IS NULL OR NOT public.evidence_exists(new.signed_path,'contracts')) THEN RAISE EXCEPTION 'Anexe o contrato assinado e a data.'; END IF; RETURN new; END $$;

CREATE OR REPLACE FUNCTION public.guard_schedule_version_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='DELETE' AND coalesce(current_setting('jmg.record_delete',true),'')='permanent' AND public.has_role(auth.uid(),'admin') THEN RETURN old; END IF;
 RAISE EXCEPTION 'Versões do cronograma são imutáveis.';
END $$;
-- A permanent removal of the schedule header must not recreate it on an unrelated work edit.
CREATE OR REPLACE FUNCTION public.ensure_work_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.schedules WHERE work_id=new.id) AND EXISTS(SELECT 1 FROM public.record_deletion_log WHERE entity='schedules' AND action='permanent' AND snapshot->>'work_id'=new.id::text) THEN RETURN new; END IF;
 INSERT INTO public.schedules(work_id,budget_id,client_id,client_name,name,address,planned_start,planned_end,responsible,notes,archived)
 VALUES(new.id,new.linked_budget_id,new.client_id,coalesce((SELECT name FROM public.people WHERE id=new.client_id),''),new.name,new.address,new.planned_start,new.planned_end,new.responsible,new.schedule_notes,new.archived)
 ON CONFLICT(work_id) DO UPDATE SET name=excluded.name,address=excluded.address,client_id=excluded.client_id,client_name=excluded.client_name,archived=excluded.archived;
 RETURN new;
END $$;

create or replace function public.copy_budget(_budget_id uuid, _as_revision boolean)
returns uuid language plpgsql security invoker set search_path = public as $$
declare nb uuid; s record; ns uuid; root uuid; nextrev int;
begin
  if not public.can_see_costs(auth.uid()) then raise exception 'Sem permissão'; end if;
  if not exists(select 1 from public.budgets where id=_budget_id and deleted_at is null) then raise exception 'Restaure o orçamento antes de duplicar ou revisar.'; end if;
  select coalesce(parent_budget_id, id) into root from public.budgets where id = _budget_id;
  perform id from public.budgets where id=root for update;
  if _as_revision then
    select coalesce(max(revision),0)+1 into nextrev from public.budgets where id = root or parent_budget_id = root;
  end if;
  insert into public.budgets (number, revision, parent_budget_id, title, client_id, architect_id, client_display,
    endereco, bairro, cidade, uf, cep, validity_date, estimated_term, params, general_discount, payment_terms,
    notes, exclusions, closing_text)
  select case when _as_revision then b.number else nextval('public.budget_number_seq') end,
    case when _as_revision then nextrev else 0 end,
    case when _as_revision then root else null end,
    b.title, b.client_id, b.architect_id, b.client_display, b.endereco, b.bairro, b.cidade, b.uf, b.cep,
    b.validity_date, b.estimated_term, b.params, b.general_discount, b.payment_terms, b.notes, b.exclusions, b.closing_text
  from public.budgets b where b.id = _budget_id returning id into nb;
  for s in select * from public.budget_sections where budget_id = _budget_id loop
    insert into public.budget_sections (budget_id, stage_id, title, materials_text, sort)
    values (nb, s.stage_id, s.title, s.materials_text, s.sort) returning id into ns;
    insert into public.budget_items (budget_id, section_id, service_id, description, unit, quantity, labor_cost_unit,
      materials, labor_markup_override, materials_markup_override, item_discount, sort)
    select nb, ns, service_id, description, unit, quantity, labor_cost_unit, materials,
      labor_markup_override, materials_markup_override, item_discount, sort
    from public.budget_items where section_id = s.id;
  end loop;
  insert into public.budget_history (budget_id, action, summary)
  values (nb, case when _as_revision then 'revisao_criada' else 'duplicado' end, jsonb_build_object('origem', _budget_id));
  return nb;
end $$;


CREATE OR REPLACE FUNCTION public.convert_budget(_budget_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ DECLARE b public.budgets; wid uuid; BEGIN IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF; SELECT * INTO b FROM public.budgets WHERE id=_budget_id FOR UPDATE; IF b.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Restaure o orçamento antes de converter.'; END IF; IF NOT FOUND OR b.status<>'aprovado' THEN RAISE EXCEPTION 'Aprove o orçamento antes de converter.'; END IF; SELECT id INTO wid FROM public.works WHERE budget_id=b.id; IF wid IS NOT NULL THEN RETURN wid; END IF; INSERT INTO public.works(budget_id,name,client_id,architect_id,address) VALUES(b.id,coalesce(nullif(b.title,''),'Obra')||' · '||coalesce(b.client_display,''),b.client_id,b.architect_id,concat_ws(', ',b.endereco,b.bairro,b.cidade,b.uf,b.cep)) RETURNING id INTO wid; INSERT INTO public.work_stages(work_id,budget_section_id,name,sort) SELECT wid,id,title,sort FROM public.budget_sections WHERE budget_id=b.id; INSERT INTO public.budget_history(budget_id,action,summary) VALUES(b.id,'convertido_em_obra',jsonb_build_object('work_id',wid)); RETURN wid; END $$;


CREATE OR REPLACE FUNCTION public.create_schedule(_data jsonb,_work_id uuid DEFAULT NULL,_budget_id uuid DEFAULT NULL,_copy_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; w public.work_registry; b public.budgets; src public.schedules; rows jsonb; mapping jsonb; BEGIN IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF; PERFORM set_config('jmg.schedule_operation','on',true); IF _work_id IS NOT NULL THEN SELECT * INTO w FROM public.work_registry WHERE id=_work_id AND NOT archived FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Obra não encontrada.'; END IF; SELECT id INTO sid FROM public.schedules WHERE work_id=w.id; IF EXISTS(SELECT 1 FROM public.schedules WHERE id=sid AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'O cronograma desta obra está na lixeira. Restaure-o antes de abrir.'; END IF; IF sid IS NULL THEN INSERT INTO public.schedules(work_id,name,client_id,client_name,address) VALUES(w.id,w.name,w.client_id,coalesce((SELECT name FROM public.people WHERE id=w.client_id),''),w.address) RETURNING id INTO sid; END IF; IF w.linked_budget_id IS NOT NULL THEN PERFORM public.import_work_schedule(w.id); END IF; RETURN sid; END IF;
IF _copy_id IS NOT NULL THEN SELECT * INTO src FROM public.schedules WHERE id=_copy_id; IF NOT FOUND OR src.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Cronograma não encontrado ou na lixeira.'; END IF; IF src.work_id IS NULL THEN rows:=src.standalone_stages; ELSE SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY sort),'[]') INTO rows FROM public.work_stages s WHERE work_id=src.work_id AND NOT removed; END IF; SELECT coalesce(jsonb_object_agg(x->>'id',gen_random_uuid()::text),'{}') INTO mapping FROM jsonb_array_elements(rows) x; SELECT coalesce(jsonb_agg((x - 'work_id' - 'budget_section_id' - 'created_by' - 'updated_by' - 'created_at' - 'updated_at')||jsonb_build_object('id',mapping->>(x->>'id'),'dependency_id',mapping->>(x->>'dependency_id'),'progress',0,'status','nao_iniciado','actual_start',NULL,'actual_end',NULL)),'[]') INTO rows FROM jsonb_array_elements(rows) x;
ELSIF _budget_id IS NOT NULL THEN SELECT * INTO b FROM public.budgets WHERE id=_budget_id; IF NOT FOUND OR b.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Orçamento não encontrado ou na lixeira.'; END IF; SELECT coalesce(jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name',bs.title,'sort',bs.sort,'weight',0,'progress',0,'status','nao_iniciado','planned_start',NULL,'planned_end',NULL,'scope_services',(SELECT string_agg(bi.description,E'\n' ORDER BY bi.sort) FROM public.budget_items bi WHERE bi.section_id=bs.id)) ORDER BY bs.sort),'[]') INTO rows FROM public.budget_sections bs WHERE bs.budget_id=b.id;
ELSE rows:='[]'; END IF;
INSERT INTO public.schedules(budget_id,client_id,client_name,name,address,description,planned_start,planned_end,responsible,notes,standalone_stages) VALUES(_budget_id,coalesce(nullif(_data->>'client_id','')::uuid,b.client_id),coalesce(_data->>'client_name',b.client_display,src.client_name,''),coalesce(nullif(_data->>'name',''),b.title,src.name||' · cópia','Novo cronograma'),coalesce(_data->>'address',b.endereco,src.address),_data->>'description',nullif(_data->>'planned_start','')::date,nullif(_data->>'planned_end','')::date,_data->>'responsible',coalesce(_data->>'notes',src.notes),rows) RETURNING id INTO sid;RETURN sid; END $$;


NOTIFY pgrst, 'reload schema';

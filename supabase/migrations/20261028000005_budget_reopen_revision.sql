-- "Reabrir para edição" (decisão do Guilherme, opção A): orçamento aprovado continua imutável; a
-- mudança vira uma revisão (copy_budget). Quando a revisão é aprovada:
--   * a versão aprovada anterior da mesma família passa a 'substituido' (superseded_by = nova);
--   * a obra ligada à versão anterior passa a apontar para a nova (linked_budget_id), com as etapas
--     religadas aos grupos de mesmo nome da nova versão;
--   * se a obra já tem contrato assinado, a aprovação é recusada: a mudança vira aditivo.
-- Tudo no mesmo UPDATE que aprova a revisão (gatilho), então falha ou acontece inteiro.

ALTER TABLE public.budgets ADD COLUMN superseded_by uuid REFERENCES public.budgets(id);
CREATE INDEX IF NOT EXISTS budgets_superseded_by_idx ON public.budgets(superseded_by);

-- Trava: aprovado, recusado e substituído não mudam; a única exceção é a troca aprovado →
-- substituído feita pelo gatilho abaixo (marcador jmg.budget_supersede na transação).
CREATE OR REPLACE FUNCTION public.guard_budget_locked() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE st public.budget_status;
BEGIN
 IF coalesce(current_setting('jmg.record_delete',true),'')='permanent' AND public.has_role(auth.uid(),'admin') AND TG_OP='DELETE' THEN RETURN old; END IF;
 IF tg_table_name IN ('budget_sections','budget_items') THEN
   IF TG_OP<>'INSERT' THEN IF EXISTS(SELECT 1 FROM public.budgets WHERE id=old.budget_id AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Restaure o orçamento antes de editar seus itens.'; END IF; END IF;
   IF TG_OP<>'DELETE' THEN IF EXISTS(SELECT 1 FROM public.budgets WHERE id=new.budget_id AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Restaure o orçamento antes de editar seus itens.'; END IF; END IF;
 END IF;
 IF TG_OP='UPDATE' AND tg_table_name='budgets' AND coalesce(current_setting('jmg.record_delete',true),'') IN ('trash','restore') AND public.has_role(auth.uid(),'admin')
   AND (to_jsonb(new)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) IS NOT DISTINCT FROM (to_jsonb(old)-ARRAY['deleted_at','deleted_by','updated_at','updated_by']) THEN RETURN new; END IF;
 IF tg_table_name='budgets' THEN
   IF TG_OP='UPDATE' AND coalesce(current_setting('jmg.budget_supersede',true),'')='on'
     AND old.status='aprovado' AND new.status='substituido' AND new.superseded_by IS NOT NULL
     AND (to_jsonb(new)-ARRAY['status','superseded_by','updated_at','updated_by']) IS NOT DISTINCT FROM (to_jsonb(old)-ARRAY['status','superseded_by','updated_at','updated_by']) THEN
     RETURN new;
   END IF;
   IF old.status IN ('aprovado','recusado','substituido') AND (to_jsonb(new)-ARRAY['archived','updated_at','updated_by']) IS DISTINCT FROM (to_jsonb(old)-ARRAY['archived','updated_at','updated_by']) THEN
     RAISE EXCEPTION 'Orçamento bloqueado. Use "Reabrir para edição".';
   END IF;
   IF new.status='substituido' THEN RAISE EXCEPTION 'Um orçamento só é substituído ao aprovar uma revisão dele.'; END IF;
   IF new.status='aprovado' AND (new.approval_date IS NULL OR NOT public.evidence_exists(new.approval_path,'approvals')) THEN RAISE EXCEPTION 'Informe data e comprovante de aprovação válido.'; END IF;
   RETURN new;
 END IF;
 IF TG_OP<>'INSERT' THEN SELECT status INTO st FROM public.budgets WHERE id=old.budget_id; IF st IN ('aprovado','recusado','substituido') THEN RAISE EXCEPTION 'Orçamento bloqueado. Use "Reabrir para edição".'; END IF; END IF;
 IF TG_OP<>'DELETE' THEN SELECT status INTO st FROM public.budgets WHERE id=new.budget_id; IF st IN ('aprovado','recusado','substituido') THEN RAISE EXCEPTION 'Orçamento bloqueado. Use "Reabrir para edição".'; END IF; END IF;
 RETURN coalesce(new,old);
END $$;

-- Obra: origem e orçamento continuam preservados, exceto a troca para a revisão aprovada da
-- mesma família feita pelo gatilho de substituição.
CREATE OR REPLACE FUNCTION public.registry_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF new.origin='orcamento' AND (new.linked_budget_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.budgets WHERE id=new.linked_budget_id AND status='aprovado')) THEN RAISE EXCEPTION 'Orçamento aprovado obrigatório para esta origem.'; END IF;
 IF new.origin='direto' AND new.linked_budget_id IS NOT NULL THEN RAISE EXCEPTION 'Cadastro direto não exige orçamento.'; END IF;
 IF TG_OP='UPDATE' AND (new.origin<>old.origin OR new.linked_budget_id IS DISTINCT FROM old.linked_budget_id) THEN
   IF NOT (coalesce(current_setting('jmg.budget_supersede',true),'')='on' AND new.origin=old.origin
     AND EXISTS(SELECT 1 FROM public.budgets o JOIN public.budgets n ON coalesce(n.parent_budget_id,n.id)=coalesce(o.parent_budget_id,o.id)
       WHERE o.id=old.linked_budget_id AND n.id=new.linked_budget_id)) THEN
     RAISE EXCEPTION 'Origem preservada.';
   END IF;
 END IF;
 IF new.planned_end<new.planned_start OR new.actual_end<new.actual_start THEN RAISE EXCEPTION 'Término anterior ao início.'; END IF;
 RETURN new;
END $$;

CREATE FUNCTION public.supersede_previous_budget() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE root uuid; prev record; w record;
BEGIN
 root := coalesce(new.parent_budget_id,new.id);
 PERFORM set_config('jmg.budget_supersede','on',true);
 FOR prev IN SELECT id, revision FROM public.budgets
   WHERE (id=root OR parent_budget_id=root) AND id<>new.id AND status='aprovado' AND deleted_at IS NULL FOR UPDATE LOOP
   FOR w IN SELECT id, name FROM public.work_registry WHERE linked_budget_id=prev.id LOOP
     IF EXISTS(SELECT 1 FROM public.contracts WHERE work_id=w.id AND status='assinado') THEN
       RAISE EXCEPTION 'A obra "%" já tem contrato assinado com a versão anterior. Registre a mudança como aditivo na obra.', w.name;
     END IF;
     UPDATE public.work_registry SET linked_budget_id=new.id WHERE id=w.id;
     -- Etapas seguem o grupo de mesmo nome da nova versão; grupos sem par ficam como estavam.
     UPDATE public.work_stages st SET budget_section_id=ns.id
     FROM public.budget_sections os, public.budget_sections ns
     WHERE st.work_id=w.id AND os.id=st.budget_section_id AND os.budget_id=prev.id
       AND ns.budget_id=new.id AND ns.title=os.title
       AND ns.id=(SELECT id FROM public.budget_sections x WHERE x.budget_id=new.id AND x.title=os.title ORDER BY sort LIMIT 1);
     INSERT INTO public.budget_history(budget_id,action,summary)
     VALUES(new.id,'obra_atualizada',jsonb_build_object('work_id',w.id,'versao_anterior',prev.id));
   END LOOP;
   UPDATE public.budgets SET status='substituido', superseded_by=new.id WHERE id=prev.id;
   INSERT INTO public.budget_history(budget_id,action,summary)
   VALUES(prev.id,'substituido',jsonb_build_object('nova_versao',new.id,'revisao',new.revision));
 END LOOP;
 PERFORM set_config('jmg.budget_supersede','',true);
 RETURN new;
END $$;
CREATE TRIGGER budgets_supersede AFTER UPDATE OF status ON public.budgets FOR EACH ROW
  WHEN (new.status='aprovado' AND old.status IS DISTINCT FROM 'aprovado')
  EXECUTE FUNCTION public.supersede_previous_budget();

-- Converter uma revisão cuja família já tem obra devolve essa obra (nunca cria uma segunda).
CREATE OR REPLACE FUNCTION public.convert_budget(_budget_id uuid, _services jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE b public.budgets; wid uuid;
BEGIN
 IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT * INTO b FROM public.budgets WHERE id=_budget_id FOR UPDATE;
 IF b.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Restaure o orçamento antes de converter.'; END IF;
 IF NOT FOUND OR b.status<>'aprovado' THEN RAISE EXCEPTION 'Aprove o orçamento antes de converter.'; END IF;
 SELECT id INTO wid FROM public.works WHERE budget_id=b.id;
 IF wid IS NULL THEN SELECT id INTO wid FROM public.work_registry WHERE linked_budget_id=b.id; END IF;
 IF wid IS NOT NULL THEN RETURN wid; END IF;
 IF jsonb_typeof(coalesce(_services,'[]'::jsonb))<>'array' THEN RAISE EXCEPTION 'Serviços inválidos.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(_services,'[]'::jsonb)) x
   WHERE NOT EXISTS(SELECT 1 FROM public.budget_items i WHERE i.id=(x->>'item_id')::uuid AND i.budget_id=b.id)) THEN
   RAISE EXCEPTION 'Serviço não pertence a este orçamento.';
 END IF;
 INSERT INTO public.works(budget_id,name,client_id,architect_id,address)
 VALUES(b.id,coalesce(nullif(b.title,''),'Obra')||' · '||coalesce(b.client_display,''),b.client_id,b.architect_id,
   concat_ws(', ',b.endereco,b.bairro,b.cidade,b.uf,b.cep)) RETURNING id INTO wid;
 INSERT INTO public.work_stages(work_id,budget_section_id,name,sort)
 SELECT wid,id,title,sort FROM public.budget_sections WHERE budget_id=b.id;
 INSERT INTO public.work_stage_services(work_id,stage_id,description,labor_planned,material_planned,sort)
 SELECT wid, st.id, coalesce(nullif(trim(i.description),''),'Serviço'),
   round(greatest(0,coalesce((x->>'labor_planned')::numeric,0)),2),
   round(greatest(0,coalesce((x->>'material_planned')::numeric,0)),2),
   i.sort
 FROM jsonb_array_elements(coalesce(_services,'[]'::jsonb)) x
 JOIN public.budget_items i ON i.id=(x->>'item_id')::uuid AND i.budget_id=b.id
 JOIN public.work_stages st ON st.work_id=wid AND st.budget_section_id=i.section_id;
 INSERT INTO public.budget_history(budget_id,action,summary)
 VALUES(b.id,'convertido_em_obra',jsonb_build_object('work_id',wid));
 RETURN wid;
END $$;

NOTIFY pgrst, 'reload schema';

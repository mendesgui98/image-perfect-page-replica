-- Converter orçamento em obra já leva cada serviço do orçamento para a etapa do seu grupo, com o
-- CUSTO previsto (mão de obra e materiais). Decisão do Guilherme: previsto da etapa = custo.
-- O custo vem calculado pelo front com computeBudget (pricing.ts, única fonte das fórmulas) em
-- _services = [{item_id, labor_planned, material_planned}]; descrição, grupo e ordem vêm do banco,
-- e só itens deste orçamento são aceitos. Tudo na mesma transação da conversão.

DROP FUNCTION public.convert_budget(uuid);
CREATE FUNCTION public.convert_budget(_budget_id uuid, _services jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE b public.budgets; wid uuid;
BEGIN
 IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT * INTO b FROM public.budgets WHERE id=_budget_id FOR UPDATE;
 IF b.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Restaure o orçamento antes de converter.'; END IF;
 IF NOT FOUND OR b.status<>'aprovado' THEN RAISE EXCEPTION 'Aprove o orçamento antes de converter.'; END IF;
 SELECT id INTO wid FROM public.works WHERE budget_id=b.id;
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
REVOKE ALL ON FUNCTION public.convert_budget(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_budget(uuid,jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

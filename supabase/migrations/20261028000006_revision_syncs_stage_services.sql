-- Revisão aprovada atualiza os serviços das etapas da obra (decisão do Guilherme).
-- Cada item de orçamento guarda a "linhagem" (origin_item_id: o item original de que as revisões
-- são cópias) e cada serviço de etapa guarda o item de onde veio (budget_item_id). Assim, ao
-- aprovar uma revisão, sync_budget_stage_services:
--   * atualiza descrição e custo (MO/material) dos serviços vindos do orçamento, mantendo o avanço;
--   * cria os serviços novos (e a etapa de um grupo novo);
--   * remove os serviços que saíram do orçamento (a exclusão fica no work_history).
-- Serviços criados à mão na obra (budget_item_id nulo) não são tocados. O custo vem do front
-- (computeBudget, pricing.ts), como em convert_budget.

ALTER TABLE public.budget_items ADD COLUMN origin_item_id uuid REFERENCES public.budget_items(id) ON DELETE SET NULL;
ALTER TABLE public.work_stage_services ADD COLUMN budget_item_id uuid REFERENCES public.budget_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS budget_items_origin_item_id_idx ON public.budget_items(origin_item_id);
CREATE INDEX IF NOT EXISTS work_stage_services_budget_item_id_idx ON public.work_stage_services(budget_item_id);

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
    -- Revisão mantém a linhagem do item; duplicata é um orçamento novo, sem linhagem.
    insert into public.budget_items (budget_id, section_id, service_id, description, unit, quantity, labor_cost_unit,
      materials, labor_markup_override, materials_markup_override, item_discount, sort, origin_item_id)
    select nb, ns, service_id, description, unit, quantity, labor_cost_unit, materials,
      labor_markup_override, materials_markup_override, item_discount, sort,
      case when _as_revision then coalesce(origin_item_id, id) else null end
    from public.budget_items where section_id = s.id;
  end loop;
  insert into public.budget_history (budget_id, action, summary)
  values (nb, case when _as_revision then 'revisao_criada' else 'duplicado' end, jsonb_build_object('origem', _budget_id));
  return nb;
end $$;

-- Conversão grava de qual item veio cada serviço.
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
 INSERT INTO public.work_stage_services(work_id,stage_id,budget_item_id,description,labor_planned,material_planned,sort)
 SELECT wid, st.id, i.id, coalesce(nullif(trim(i.description),''),'Serviço'),
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

CREATE FUNCTION public.sync_budget_stage_services(_budget_id uuid, _services jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE b public.budgets; wid uuid;
BEGIN
 IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT * INTO b FROM public.budgets WHERE id=_budget_id;
 IF NOT FOUND OR b.status<>'aprovado' OR b.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Só orçamento aprovado atualiza as etapas da obra.'; END IF;
 SELECT id INTO wid FROM public.work_registry WHERE linked_budget_id=b.id FOR UPDATE;
 IF wid IS NULL THEN RETURN NULL; END IF;
 IF jsonb_typeof(coalesce(_services,'[]'::jsonb))<>'array' THEN RAISE EXCEPTION 'Serviços inválidos.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_services) x
   WHERE NOT EXISTS(SELECT 1 FROM public.budget_items i WHERE i.id=(x->>'item_id')::uuid AND i.budget_id=b.id)) THEN
   RAISE EXCEPTION 'Serviço não pertence a este orçamento.';
 END IF;

 -- Grupo sem etapa ativa na obra ganha uma etapa.
 INSERT INTO public.work_stages(work_id,budget_section_id,name,sort)
 SELECT wid, s.id, s.title, coalesce((SELECT max(sort)+1 FROM public.work_stages WHERE work_id=wid),0)+s.sort
 FROM public.budget_sections s
 WHERE s.budget_id=b.id AND NOT EXISTS(SELECT 1 FROM public.work_stages st WHERE st.work_id=wid AND st.budget_section_id=s.id AND NOT st.removed);

 DROP TABLE IF EXISTS _sync;
 CREATE TEMP TABLE _sync ON COMMIT DROP AS
 SELECT i.id item_id, coalesce(i.origin_item_id,i.id) lineage, coalesce(nullif(trim(i.description),''),'Serviço') description, i.sort,
   (SELECT st.id FROM public.work_stages st WHERE st.work_id=wid AND st.budget_section_id=i.section_id AND NOT st.removed ORDER BY st.sort LIMIT 1) stage_id,
   round(greatest(0,coalesce((x->>'labor_planned')::numeric,0)),2) labor,
   round(greatest(0,coalesce((x->>'material_planned')::numeric,0)),2) material
 FROM jsonb_array_elements(_services) x JOIN public.budget_items i ON i.id=(x->>'item_id')::uuid;

 -- Serviços que saíram do orçamento.
 DELETE FROM public.work_stage_services ss USING public.budget_items o
 WHERE ss.work_id=wid AND o.id=ss.budget_item_id
   AND coalesce(o.origin_item_id,o.id) NOT IN (SELECT lineage FROM _sync);
 -- Serviços que continuam: novo custo, descrição e etapa; o avanço fica.
 UPDATE public.work_stage_services ss SET budget_item_id=n.item_id, description=n.description,
   labor_planned=n.labor, material_planned=n.material, stage_id=n.stage_id, sort=n.sort
 FROM public.budget_items o, _sync n
 WHERE ss.work_id=wid AND o.id=ss.budget_item_id AND coalesce(o.origin_item_id,o.id)=n.lineage;
 -- Serviços novos.
 INSERT INTO public.work_stage_services(work_id,stage_id,budget_item_id,description,labor_planned,material_planned,sort)
 SELECT wid, n.stage_id, n.item_id, n.description, n.labor, n.material, n.sort FROM _sync n
 WHERE NOT EXISTS(SELECT 1 FROM public.work_stage_services ss WHERE ss.work_id=wid AND ss.budget_item_id=n.item_id);

 INSERT INTO public.budget_history(budget_id,action,summary)
 VALUES(b.id,'etapas_atualizadas',jsonb_build_object('work_id',wid,'servicos',jsonb_array_length(_services)));
 RETURN wid;
END $$;
REVOKE ALL ON FUNCTION public.sync_budget_stage_services(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_budget_stage_services(uuid,jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

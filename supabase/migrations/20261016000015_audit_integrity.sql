-- New registrations require explicit administrator approval. Existing roles remain intact.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles(id,full_name,email)
  VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email);
  RETURN new;
END $$;
ALTER POLICY "profiles read" ON public.profiles USING(id=auth.uid() OR public.has_role(auth.uid(),'admin'));
ALTER POLICY "people read" ON public.people USING(public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));
ALTER POLICY "people ins" ON public.people WITH CHECK(public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));
ALTER POLICY "people upd" ON public.people USING(public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));
ALTER POLICY "company read" ON public.company_settings USING(public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));
ALTER POLICY "stages read" ON public.stages USING(public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));
ALTER POLICY "cats read" ON public.cost_categories USING(public.can_see_costs(auth.uid()) OR public.has_role(auth.uid(),'equipe'));

-- The application creates a draft and approves it through the guarded UPDATE path.
CREATE FUNCTION public.guard_budget_initial_status() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF new.status<>'elaboracao' THEN RAISE EXCEPTION 'Crie o orçamento em elaboração e registre a aprovação com comprovante.'; END IF;
  RETURN new;
END $$;
CREATE TRIGGER budget_initial_status BEFORE INSERT ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.guard_budget_initial_status();

-- Refuse inconsistent legacy rows instead of silently moving commercial items.
ALTER TABLE public.budget_sections ADD CONSTRAINT budget_section_identity UNIQUE(id,budget_id);
ALTER TABLE public.budget_items ADD CONSTRAINT item_section_same_budget FOREIGN KEY(section_id,budget_id) REFERENCES public.budget_sections(id,budget_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX budget_revision_identity ON public.budgets(number,revision);

-- Preserve allocations when the source entry changes, serializing against new allocations.
CREATE FUNCTION public.guard_allocated_entry() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE allocated numeric;
BEGIN
  SELECT coalesce(sum(amount),0) INTO allocated FROM public.expense_allocations WHERE entry_id=old.id;
  IF allocated>0 AND (new.amount<allocated OR new.canceled OR new.work_id IS NOT NULL OR new.direction<>'saida' OR new.purchase_order_id IS NOT NULL OR new.payable_order_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Lançamento rateado deve preservar o valor atribuído e permanecer uma despesa geral ativa.';
  END IF;
  RETURN new;
END $$;
CREATE TRIGGER allocated_entry_guard BEFORE UPDATE ON public.financial_entries FOR EACH ROW EXECUTE FUNCTION public.guard_allocated_entry();
CREATE OR REPLACE FUNCTION public.guard_allocation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE e public.financial_entries; total numeric;
BEGIN
  SELECT * INTO e FROM public.financial_entries WHERE id=new.entry_id FOR UPDATE;
  IF NOT FOUND OR e.canceled OR e.work_id IS NOT NULL OR e.direction<>'saida' OR e.purchase_order_id IS NOT NULL OR e.payable_order_id IS NOT NULL THEN RAISE EXCEPTION 'Rateie apenas despesas gerais ativas sem obra.'; END IF;
  SELECT coalesce(sum(amount),0) INTO total FROM public.expense_allocations WHERE entry_id=e.id;
  IF total+new.amount>e.amount THEN RAISE EXCEPTION 'Rateio excede a despesa.'; END IF;
  RETURN new;
END $$;

-- Uploaded evidence must remain available after it is referenced by a business record.
CREATE FUNCTION public.document_is_referenced(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.budgets WHERE approval_path=_path)
 OR EXISTS(SELECT 1 FROM public.contracts WHERE signed_path=_path)
 OR EXISTS(SELECT 1 FROM public.work_extras WHERE file_path=_path)
 OR EXISTS(SELECT 1 FROM public.work_records WHERE file_path=_path)
 OR EXISTS(SELECT 1 FROM public.purchase_orders WHERE file_path=_path)
 OR EXISTS(SELECT 1 FROM public.financial_entries WHERE file_path=_path)
 OR EXISTS(SELECT 1 FROM public.financial_settlements WHERE file_path=_path)
$$;
REVOKE ALL ON FUNCTION public.document_is_referenced(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.document_is_referenced(text) TO authenticated;
-- Restrictive policy also protects against other permissive DELETE policies.
CREATE POLICY jmg_documents_retain_references ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING(bucket_id<>'jmg-documents' OR NOT public.document_is_referenced(name));

-- Save service header and material composition as a single transaction.
CREATE FUNCTION public.save_service_composition(_id uuid,_data jsonb,_composition jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE sid uuid; row jsonb;
BEGIN
  IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  IF nullif(trim(_data->>'description'),'') IS NULL OR coalesce((_data->>'labor_cost')::numeric,0)<0 OR jsonb_typeof(_composition) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Confira descrição, custo e composição.'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.services(description,stage_id,unit,labor_cost,active) VALUES(trim(_data->>'description'),nullif(_data->>'stage_id','')::uuid,(_data->>'unit')::public.service_unit,coalesce((_data->>'labor_cost')::numeric,0),coalesce((_data->>'active')::boolean,true)) RETURNING id INTO sid;
  ELSE
    UPDATE public.services SET description=trim(_data->>'description'),stage_id=nullif(_data->>'stage_id','')::uuid,unit=(_data->>'unit')::public.service_unit,labor_cost=coalesce((_data->>'labor_cost')::numeric,0),active=coalesce((_data->>'active')::boolean,true) WHERE id=_id RETURNING id INTO sid;
    IF sid IS NULL THEN RAISE EXCEPTION 'Serviço não encontrado.'; END IF;
  END IF;
  DELETE FROM public.service_materials WHERE service_id=sid;
  FOR row IN SELECT value FROM jsonb_array_elements(_composition) LOOP
    IF nullif(row->>'material_id','') IS NULL OR (row->>'consumption') IS NULL OR (row->>'loss_pct') IS NULL OR (row->>'consumption')::numeric<0 OR (row->>'loss_pct')::numeric<0 THEN RAISE EXCEPTION 'Confira material, consumo e perda.'; END IF;
    INSERT INTO public.service_materials(service_id,material_id,consumption,loss_pct) VALUES(sid,(row->>'material_id')::uuid,(row->>'consumption')::numeric,(row->>'loss_pct')::numeric);
  END LOOP;
  RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.save_service_composition(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_service_composition(uuid,jsonb,jsonb) TO authenticated;

-- Serialize revision numbers by the immutable root budget.
create or replace function public.copy_budget(_budget_id uuid, _as_revision boolean)
returns uuid language plpgsql security invoker set search_path = public as $$
declare nb uuid; s record; ns uuid; root uuid; nextrev int;
begin
  if not public.can_see_costs(auth.uid()) then raise exception 'Sem permissão'; end if;
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

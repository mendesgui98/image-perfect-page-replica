-- Modelo oficial de orçamento (PDF gerado pela API). Campos novos da proposta:
--   * budgets: responsável, início previsto, prazo em semanas (vazio = duração do cronograma),
--     tipo de imóvel e metragem, descrição da obra;
--   * budget_sections: descrição curta da etapa e posição no cronograma (semana de início e
--     duração em semanas; vazio = etapa começa depois da anterior e dura 1 semana).
-- A trava de orçamento aprovado compara a linha inteira (to_jsonb), então os campos novos já
-- ficam bloqueados junto com os demais; copy_budget passa a copiá-los.

ALTER TABLE public.budgets
  ADD COLUMN responsible text,
  ADD COLUMN start_date date,
  ADD COLUMN estimated_weeks integer CHECK (estimated_weeks IS NULL OR estimated_weeks BETWEEN 1 AND 520),
  ADD COLUMN property_type text,
  ADD COLUMN property_area numeric CHECK (property_area IS NULL OR property_area >= 0),
  ADD COLUMN description text;

ALTER TABLE public.budget_sections
  ADD COLUMN description text,
  ADD COLUMN start_week integer CHECK (start_week IS NULL OR start_week BETWEEN 1 AND 520),
  ADD COLUMN duration_weeks integer CHECK (duration_weeks IS NULL OR duration_weeks BETWEEN 1 AND 520);

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
    notes, exclusions, closing_text, responsible, start_date, estimated_weeks, property_type, property_area, description)
  select case when _as_revision then b.number else nextval('public.budget_number_seq') end,
    case when _as_revision then nextrev else 0 end,
    case when _as_revision then root else null end,
    b.title, b.client_id, b.architect_id, b.client_display, b.endereco, b.bairro, b.cidade, b.uf, b.cep,
    -- A validade vale para a emissão original; a cópia volta a usar emissão + 15 dias.
    null, b.estimated_term, b.params, b.general_discount, b.payment_terms, b.notes, b.exclusions, b.closing_text,
    b.responsible, b.start_date, b.estimated_weeks, b.property_type, b.property_area, b.description
  from public.budgets b where b.id = _budget_id returning id into nb;
  for s in select * from public.budget_sections where budget_id = _budget_id loop
    insert into public.budget_sections (budget_id, stage_id, title, materials_text, sort, description, start_week, duration_weeks)
    values (nb, s.stage_id, s.title, s.materials_text, s.sort, s.description, s.start_week, s.duration_weeks) returning id into ns;
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

NOTIFY pgrst, 'reload schema';

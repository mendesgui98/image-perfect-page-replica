
-- ===== Roles & profiles =====
create type public.app_role as enum ('admin','financeiro','equipe');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.can_see_costs(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','financeiro'))
$$;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "roles read own or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles admin insert" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));
create policy "roles admin delete" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'equipe');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Audit helper =====
create or replace function public.touch_audit()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
  return new;
end $$;

-- ===== Company & pricing settings (singletons) =====
create table public.company_settings (
  id int primary key default 1 check (id = 1),
  razao_social text, nome_fantasia text, cnpj text,
  endereco text, bairro text, cidade text, uf text, cep text,
  responsavel text, telefone text, email text, instagram text,
  banco text, agencia text, conta text, pix text,
  sobre text, texto_fechamento text, condicoes_padrao text,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.company_settings to authenticated;
grant all on public.company_settings to service_role;
alter table public.company_settings enable row level security;
create policy "company read" on public.company_settings for select to authenticated using (true);
create policy "company admin ins" on public.company_settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "company admin upd" on public.company_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger company_audit before insert or update on public.company_settings for each row execute function public.touch_audit();

create table public.pricing_settings (
  id int primary key default 1 check (id = 1),
  labor_markup numeric not null default 0,
  materials_markup numeric not null default 0,
  negotiation_reserve numeric not null default 0,
  desired_margin numeric not null default 0,
  min_margin numeric not null default 0,
  architect_commission numeric not null default 0,
  reinvestment_share numeric not null default 0,
  taxes jsonb not null default '[]'::jsonb,
  configured boolean not null default false,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.pricing_settings to authenticated;
grant all on public.pricing_settings to service_role;
alter table public.pricing_settings enable row level security;
create policy "pricing read" on public.pricing_settings for select to authenticated using (public.can_see_costs(auth.uid()));
create policy "pricing admin ins" on public.pricing_settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "pricing admin upd" on public.pricing_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger pricing_audit before insert or update on public.pricing_settings for each row execute function public.touch_audit();

-- ===== Stages & cost categories =====
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null, sort int not null default 0, active boolean not null default true,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.cost_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, sort int not null default 0, active boolean not null default true,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.stages, public.cost_categories to authenticated;
grant all on public.stages, public.cost_categories to service_role;
alter table public.stages enable row level security;
alter table public.cost_categories enable row level security;
create policy "stages read" on public.stages for select to authenticated using (true);
create policy "stages admin ins" on public.stages for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "stages admin upd" on public.stages for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "cats read" on public.cost_categories for select to authenticated using (true);
create policy "cats admin ins" on public.cost_categories for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "cats admin upd" on public.cost_categories for update to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger stages_audit before insert or update on public.stages for each row execute function public.touch_audit();
create trigger cats_audit before insert or update on public.cost_categories for each row execute function public.touch_audit();

-- ===== People =====
create type public.person_kind as enum ('cliente','contato','arquiteto','fornecedor','prestador');
create table public.people (
  id uuid primary key default gen_random_uuid(),
  kind public.person_kind not null,
  name text not null,
  document text, rg text, email text, phone text,
  endereco text, bairro text, cidade text, uf text, cep text,
  specialty text, notes text,
  active boolean not null default true,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update on public.people to authenticated;
grant all on public.people to service_role;
alter table public.people enable row level security;
create policy "people read" on public.people for select to authenticated using (true);
create policy "people ins" on public.people for insert to authenticated with check (true);
create policy "people upd" on public.people for update to authenticated using (true);
create trigger people_audit before insert or update on public.people for each row execute function public.touch_audit();

-- ===== Catalog =====
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purchase_unit text not null,
  consumption_unit text not null,
  conversion numeric not null default 1 check (conversion > 0),
  price numeric not null default 0,
  supplier_id uuid references public.people(id),
  price_updated_at date not null default current_date,
  active boolean not null default true,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create type public.service_unit as enum ('m2','ml','un','diaria','vb');
create table public.services (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.stages(id),
  description text not null,
  unit public.service_unit not null default 'un',
  labor_cost numeric not null default 0,
  active boolean not null default true,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.service_materials (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  consumption numeric not null default 0,
  loss_pct numeric not null default 0,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.catalog_history (
  id uuid primary key default gen_random_uuid(),
  entity text not null, entity_id uuid not null,
  before jsonb, after jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
grant select, insert, update, delete on public.materials, public.services, public.service_materials to authenticated;
grant select, insert on public.catalog_history to authenticated;
grant all on public.materials, public.services, public.service_materials, public.catalog_history to service_role;
alter table public.materials enable row level security;
alter table public.services enable row level security;
alter table public.service_materials enable row level security;
alter table public.catalog_history enable row level security;
do $$ declare t text; begin
  foreach t in array array['materials','services','service_materials'] loop
    execute format('create policy "%1$s read" on public.%1$s for select to authenticated using (public.can_see_costs(auth.uid()))', t);
    execute format('create policy "%1$s ins" on public.%1$s for insert to authenticated with check (public.can_see_costs(auth.uid()))', t);
    execute format('create policy "%1$s upd" on public.%1$s for update to authenticated using (public.can_see_costs(auth.uid()))', t);
    execute format('create trigger %1$s_audit before insert or update on public.%1$s for each row execute function public.touch_audit()', t);
  end loop;
end $$;
create policy "service_materials del" on public.service_materials for delete to authenticated using (public.can_see_costs(auth.uid()));
create policy "history read" on public.catalog_history for select to authenticated using (public.can_see_costs(auth.uid()));

create or replace function public.log_catalog_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.catalog_history(entity, entity_id, before, after, changed_by)
  values (tg_table_name, coalesce(new.id, old.id),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end, auth.uid());
  return coalesce(new, old);
end $$;
create trigger materials_hist after insert or update on public.materials for each row execute function public.log_catalog_change();
create trigger services_hist after insert or update on public.services for each row execute function public.log_catalog_change();
create trigger svcmat_hist after insert or update or delete on public.service_materials for each row execute function public.log_catalog_change();

-- ===== Budgets =====
create type public.budget_status as enum ('elaboracao','enviado','aprovado','recusado','cancelado');
create sequence public.budget_number_seq start 1;
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  number int not null default nextval('public.budget_number_seq'),
  revision int not null default 0,
  parent_budget_id uuid references public.budgets(id),
  title text not null default 'Proposta de Reforma',
  client_id uuid references public.people(id),
  architect_id uuid references public.people(id),
  client_display text,
  endereco text, bairro text, cidade text, uf text, cep text,
  status public.budget_status not null default 'elaboracao',
  issue_date date not null default current_date,
  validity_date date,
  estimated_term text,
  params jsonb not null default '{}'::jsonb,
  general_discount numeric not null default 0,
  payment_terms jsonb not null default '[]'::jsonb,
  notes text, exclusions text, closing_text text,
  archived boolean not null default false,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.budget_sections (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  stage_id uuid references public.stages(id),
  title text not null,
  materials_text text,
  sort int not null default 0,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create type public.supplier_side as enum ('jmg','cliente');
create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  section_id uuid not null references public.budget_sections(id) on delete cascade,
  service_id uuid references public.services(id),
  description text not null,
  unit public.service_unit not null default 'un',
  quantity numeric not null default 1,
  labor_cost_unit numeric not null default 0,
  materials jsonb not null default '[]'::jsonb,
  labor_markup_override numeric,
  materials_markup_override numeric,
  item_discount numeric not null default 0,
  sort int not null default 0,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.budget_history (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  action text not null,
  summary jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
grant select, insert, update, delete on public.budgets, public.budget_sections, public.budget_items to authenticated;
grant select, insert on public.budget_history to authenticated;
grant usage on sequence public.budget_number_seq to authenticated;
grant all on public.budgets, public.budget_sections, public.budget_items, public.budget_history to service_role;
alter table public.budgets enable row level security;
alter table public.budget_sections enable row level security;
alter table public.budget_items enable row level security;
alter table public.budget_history enable row level security;
do $$ declare t text; begin
  foreach t in array array['budgets','budget_sections','budget_items'] loop
    execute format('create policy "%1$s read" on public.%1$s for select to authenticated using (public.can_see_costs(auth.uid()))', t);
    execute format('create policy "%1$s ins" on public.%1$s for insert to authenticated with check (public.can_see_costs(auth.uid()))', t);
    execute format('create policy "%1$s upd" on public.%1$s for update to authenticated using (public.can_see_costs(auth.uid()))', t);
    execute format('create trigger %1$s_audit before insert or update on public.%1$s for each row execute function public.touch_audit()', t);
  end loop;
end $$;
create policy "sections del" on public.budget_sections for delete to authenticated using (public.can_see_costs(auth.uid()));
create policy "items del" on public.budget_items for delete to authenticated using (public.can_see_costs(auth.uid()));
create policy "bh read" on public.budget_history for select to authenticated using (public.can_see_costs(auth.uid()));
create policy "bh ins" on public.budget_history for insert to authenticated with check (public.can_see_costs(auth.uid()));

-- Lock edits once a budget is approved/refused (history preserved; changes go via revisions)
create or replace function public.guard_budget_locked()
returns trigger language plpgsql set search_path = public as $$
declare st public.budget_status;
begin
  if tg_table_name = 'budgets' then
    if old.status in ('aprovado','recusado') and (new.params is distinct from old.params
       or new.general_discount is distinct from old.general_discount
       or new.payment_terms is distinct from old.payment_terms) then
      raise exception 'Orçamento % está bloqueado. Crie uma revisão.', old.status;
    end if;
    return new;
  end if;
  select status into st from public.budgets where id = coalesce(new.budget_id, old.budget_id);
  if st in ('aprovado','recusado') then
    raise exception 'Orçamento bloqueado. Crie uma revisão.';
  end if;
  return coalesce(new, old);
end $$;
create trigger budgets_lock before update on public.budgets for each row execute function public.guard_budget_locked();
create trigger sections_lock before insert or update or delete on public.budget_sections for each row execute function public.guard_budget_locked();
create trigger items_lock before insert or update or delete on public.budget_items for each row execute function public.guard_budget_locked();

-- Duplicate / revise a budget atomically
create or replace function public.copy_budget(_budget_id uuid, _as_revision boolean)
returns uuid language plpgsql security invoker set search_path = public as $$
declare nb uuid; s record; ns uuid; root uuid; nextrev int;
begin
  if not public.can_see_costs(auth.uid()) then raise exception 'Sem permissão'; end if;
  select coalesce(parent_budget_id, id) into root from public.budgets where id = _budget_id;
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
grant execute on function public.copy_budget(uuid, boolean) to authenticated;

-- ===== Initial configuration data (editable) =====
insert into public.stages (name, sort) values
 ('Proteção e sinalização',1),('Remoções',2),('Demolição',3),('Alvenaria',4),('Elétrica',5),
 ('Hidráulica',6),('Automação',7),('Som',8),('Ar-condicionado',9),('Drywall',10),('Pintura',11),
 ('Instalações finais',12),('Gerenciamento',13),('Responsabilidade técnica',14),('Seguro de obra',15);
insert into public.cost_categories (name, sort) values
 ('Mão de obra',1),('Materiais',2),('Despesas administrativas',3),('Despesas indiretas',4),('Locomoção',5),('Outras',6);
insert into public.pricing_settings (id) values (1);
-- Company data taken from the client's own contract and budget models
insert into public.company_settings (id, razao_social, nome_fantasia, cnpj, endereco, bairro, cidade, uf, cep,
  responsavel, telefone, instagram, banco, agencia, conta, pix, sobre, texto_fechamento)
values (1, 'JMG Reformas LTDA', 'JMG Reformas', '62.780.542/0001-81', 'Rua da Turquesa, nº 43 - Casa',
  'Refúgio dos Bandeirantes', 'Santana de Parnaíba', 'SP', '06506-055', 'Guilherme Andriola Mendes',
  '(11) 99893-7694', '@jmg.reformas', 'Banco C6', '0001', '39813290-9', '62.780.542/0001-81',
  'A JMG Reformas é uma empresa especializada em soluções completas para obras e reformas, unindo qualidade, compromisso e eficiência em cada projeto. Atuamos com foco na excelência dos serviços prestados, buscando sempre superar as expectativas de nossos clientes por meio de um atendimento personalizado e resultados duradouros.

Com uma equipe qualificada e comprometida, a JMG Reformas oferece desde pequenas intervenções até grandes empreendimentos, sempre prezando pela segurança, pontualidade e utilização de materiais de alta qualidade.

Nosso objetivo é transformar ideias em realidade, entregando obras que aliam funcionalidade, estética e sustentabilidade, garantindo a satisfação plena de nossos clientes e parceiros.',
  'O orçamento apresentado foi elaborado com base no projeto apresentado. Os materiais listados e citados serão demandados conforme o avanço dos serviços em loco. Agradecemos sinceramente a oportunidade de participar da realização desse sonho e reforçamos nosso comprometimento em cada etapa do processo.

Colocamo-nos à inteira disposição para prestar quaisquer esclarecimentos necessários e dar continuidade às negociações.');

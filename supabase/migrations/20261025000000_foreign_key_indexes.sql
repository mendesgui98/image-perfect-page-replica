-- Índices para chaves estrangeiras sem índice (achado B08 do relatório técnico).
-- Acelera joins, filtros por obra/orçamento e exclusões com verificação de vínculo.
-- Idempotente: pode ser reaplicada sem efeito colateral.

CREATE INDEX IF NOT EXISTS account_transfers_from_account_id_idx ON public.account_transfers (from_account_id);
CREATE INDEX IF NOT EXISTS account_transfers_to_account_id_idx ON public.account_transfers (to_account_id);
CREATE INDEX IF NOT EXISTS budget_history_budget_id_idx ON public.budget_history (budget_id);
CREATE INDEX IF NOT EXISTS budget_items_budget_id_idx ON public.budget_items (budget_id);
CREATE INDEX IF NOT EXISTS budget_items_section_id_idx ON public.budget_items (section_id);
CREATE INDEX IF NOT EXISTS budget_items_service_id_idx ON public.budget_items (service_id);
CREATE INDEX IF NOT EXISTS budget_sections_budget_id_idx ON public.budget_sections (budget_id);
CREATE INDEX IF NOT EXISTS budget_sections_stage_id_idx ON public.budget_sections (stage_id);
CREATE INDEX IF NOT EXISTS budgets_architect_id_idx ON public.budgets (architect_id);
CREATE INDEX IF NOT EXISTS budgets_client_id_idx ON public.budgets (client_id);
CREATE INDEX IF NOT EXISTS budgets_parent_budget_id_idx ON public.budgets (parent_budget_id);
CREATE INDEX IF NOT EXISTS expense_allocations_work_id_idx ON public.expense_allocations (work_id);
CREATE INDEX IF NOT EXISTS financial_entries_payable_order_id_idx ON public.financial_entries (payable_order_id);
CREATE INDEX IF NOT EXISTS financial_entries_person_id_idx ON public.financial_entries (person_id);
CREATE INDEX IF NOT EXISTS financial_entries_stage_id_idx ON public.financial_entries (stage_id);
CREATE INDEX IF NOT EXISTS financial_settlements_account_id_idx ON public.financial_settlements (account_id);
CREATE INDEX IF NOT EXISTS financial_settlements_entry_id_idx ON public.financial_settlements (entry_id);
CREATE INDEX IF NOT EXISTS material_movements_work_id_idx ON public.material_movements (work_id);
CREATE INDEX IF NOT EXISTS materials_supplier_id_idx ON public.materials (supplier_id);
CREATE INDEX IF NOT EXISTS purchase_lines_order_id_idx ON public.purchase_lines (order_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON public.purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS schedules_budget_id_idx ON public.schedules (budget_id);
CREATE INDEX IF NOT EXISTS schedules_client_id_idx ON public.schedules (client_id);
CREATE INDEX IF NOT EXISTS service_materials_material_id_idx ON public.service_materials (material_id);
CREATE INDEX IF NOT EXISTS service_materials_service_id_idx ON public.service_materials (service_id);
CREATE INDEX IF NOT EXISTS services_stage_id_idx ON public.services (stage_id);
CREATE INDEX IF NOT EXISTS work_extras_work_id_idx ON public.work_extras (work_id);
CREATE INDEX IF NOT EXISTS work_history_work_id_idx ON public.work_history (work_id);
CREATE INDEX IF NOT EXISTS work_records_stage_id_idx ON public.work_records (stage_id);
CREATE INDEX IF NOT EXISTS work_stages_budget_section_id_idx ON public.work_stages (budget_section_id);
CREATE INDEX IF NOT EXISTS work_stages_dependency_id_idx ON public.work_stages (dependency_id);
CREATE INDEX IF NOT EXISTS works_architect_id_idx ON public.works (architect_id);
CREATE INDEX IF NOT EXISTS works_client_id_idx ON public.works (client_id);

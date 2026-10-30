-- Funil comercial (roteiro R2-2): motivo da recusa do orçamento, informado ao marcar como recusado.
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS refusal_reason text;

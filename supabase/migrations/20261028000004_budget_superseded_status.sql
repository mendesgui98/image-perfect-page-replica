-- Situação de orçamento aprovado que foi trocado por uma revisão aprovada depois.
-- Fica sozinho nesta migração: o valor novo do enum só pode ser usado depois do commit.
ALTER TYPE public.budget_status ADD VALUE IF NOT EXISTS 'substituido';

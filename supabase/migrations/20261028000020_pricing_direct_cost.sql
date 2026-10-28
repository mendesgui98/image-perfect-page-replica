-- Precificação pelo custo direto: preço = custo direto ÷ [1 − (estrutura + RT + impostos + margem)].
-- Padrões da JMG em Configurações > Precificação. RT padrão = architect_commission, margem-alvo =
-- desired_margin e margem mínima = min_margin (colunas existentes). Cada orçamento novo guarda
-- uma cópia dos percentuais em budgets.params (com model = 'custo_direto'), então mudar estes
-- padrões não altera orçamentos já criados. Orçamentos antigos (params sem model) seguem o
-- cálculo por acréscimo sobre custo.

ALTER TABLE public.pricing_settings
  ADD COLUMN structure_rate numeric NOT NULL DEFAULT 12.5 CHECK (structure_rate >= 0 AND structure_rate < 100),
  ADD COLUMN tax_rate numeric NOT NULL DEFAULT 8 CHECK (tax_rate >= 0 AND tax_rate < 100);

-- Valores definidos pela JMG para o novo modelo.
UPDATE public.pricing_settings
   SET architect_commission = 10, desired_margin = 15, min_margin = 10, configured = true;

NOTIFY pgrst, 'reload schema';

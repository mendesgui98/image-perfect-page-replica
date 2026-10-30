-- Precificação pelo custo direto com os percentuais (estrutura, RT, impostos e margem) só sobre a
-- mão de obra; os materiais levam apenas o imposto (params.rates_base = 'mao_de_obra', ver
-- pricing.ts). Vale para os orçamentos em aberto e os novos; aprovados, recusados e substituídos
-- continuam com o cálculo com que foram fechados.

CREATE OR REPLACE FUNCTION public.direct_cost_params(_params jsonb, _with_architect boolean)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT coalesce(_params,'{}'::jsonb) || jsonb_build_object(
    'model','custo_direto',
    'rates_base','mao_de_obra',
    'structure_rate', ps.structure_rate,
    'architect_commission', ps.architect_commission,
    'apply_rt', _with_architect,
    'tax_rate', ps.tax_rate,
    'desired_margin', ps.desired_margin,
    'min_margin', ps.min_margin,
    'negotiated_price', NULL)
  FROM public.pricing_settings ps WHERE ps.id=1
$$;

-- Revisões e cópias (copy_budget) também nascem com os percentuais só sobre a mão de obra;
-- as que já estavam no custo direto mantêm os percentuais e o preço negociado.
CREATE OR REPLACE FUNCTION public.budget_direct_cost_default() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF new.status IN ('elaboracao','enviado') THEN
   IF coalesce(new.params->>'model','')<>'custo_direto' THEN
     new.params := coalesce(public.direct_cost_params(new.params, new.architect_id IS NOT NULL), new.params);
   ELSIF coalesce(new.params->>'rates_base','')<>'mao_de_obra' THEN
     new.params := new.params || jsonb_build_object('rates_base','mao_de_obra');
   END IF;
 END IF;
 RETURN new;
END $$;

-- Orçamentos em aberto passam para a nova base.
WITH moved AS (
  UPDATE public.budgets b
     SET params = CASE WHEN coalesce(b.params->>'model','')='custo_direto'
                       THEN b.params || jsonb_build_object('rates_base','mao_de_obra')
                       ELSE public.direct_cost_params(b.params, b.architect_id IS NOT NULL) END
   WHERE b.status IN ('elaboracao','enviado') AND b.deleted_at IS NULL
     AND coalesce(b.params->>'rates_base','')<>'mao_de_obra'
  RETURNING b.id
)
INSERT INTO public.budget_history(budget_id, action, summary)
SELECT id, 'precificacao',
       jsonb_build_object('mudanca','percentuais só sobre a mão de obra; materiais só com imposto')
  FROM moved;

NOTIFY pgrst, 'reload schema';

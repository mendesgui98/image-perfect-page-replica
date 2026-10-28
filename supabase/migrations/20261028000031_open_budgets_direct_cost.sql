-- Todo orçamento ainda em aberto (elaboração/enviado) usa a precificação pelo custo direto.
-- Os percentuais vêm de Configurações > Precificação; aprovados, recusados e substituídos
-- continuam com o cálculo com que foram fechados.

CREATE FUNCTION public.direct_cost_params(_params jsonb, _with_architect boolean)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT coalesce(_params,'{}'::jsonb) || jsonb_build_object(
    'model','custo_direto',
    'structure_rate', ps.structure_rate,
    'architect_commission', ps.architect_commission,
    'apply_rt', _with_architect,
    'tax_rate', ps.tax_rate,
    'desired_margin', ps.desired_margin,
    'min_margin', ps.min_margin,
    'negotiated_price', NULL)
  FROM public.pricing_settings ps WHERE ps.id=1
$$;

-- Revisões e cópias (copy_budget) de orçamentos antigos já nascem no modelo novo.
CREATE FUNCTION public.budget_direct_cost_default() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF new.status IN ('elaboracao','enviado') AND coalesce(new.params->>'model','')<>'custo_direto' THEN
   new.params := coalesce(public.direct_cost_params(new.params, new.architect_id IS NOT NULL), new.params);
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER budgets_direct_cost_default BEFORE INSERT ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.budget_direct_cost_default();

-- Orçamentos em aberto que ainda estavam no cálculo antigo.
WITH moved AS (
  UPDATE public.budgets b
     SET params = public.direct_cost_params(b.params, b.architect_id IS NOT NULL)
   WHERE b.status IN ('elaboracao','enviado') AND b.deleted_at IS NULL
     AND coalesce(b.params->>'model','')<>'custo_direto'
  RETURNING b.id
)
INSERT INTO public.budget_history(budget_id, action, summary)
SELECT id, 'precificacao', jsonb_build_object('mudanca','passou para a precificação pelo custo direto')
  FROM moved;

NOTIFY pgrst, 'reload schema';

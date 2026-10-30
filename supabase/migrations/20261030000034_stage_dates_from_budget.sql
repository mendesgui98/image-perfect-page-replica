-- Datas das etapas da obra vindas do cronograma do orçamento aprovado (aba Cronograma do
-- orçamento: data de início + semana de início e duração de cada etapa). Mesma conta de
-- stageWeeks/scheduleEnd em src/lib/proposal.ts: etapa sem semana começa logo depois da anterior,
-- sem duração dura 1 semana, e termina na sexta-feira da última semana.
-- Só preenche etapas sem data: datas já ajustadas na obra nunca são trocadas.

CREATE FUNCTION public.budget_section_dates(_section uuid, OUT planned_start date, OUT planned_end date)
LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE b_start date; b_id uuid; prev_end integer := 0; sw integer; dw integer; r record;
BEGIN
 SELECT s.budget_id, b.start_date INTO b_id, b_start
   FROM public.budget_sections s JOIN public.budgets b ON b.id=s.budget_id WHERE s.id=_section;
 IF b_start IS NULL THEN RETURN; END IF;
 FOR r IN SELECT id, start_week, duration_weeks FROM public.budget_sections
          WHERE budget_id=b_id ORDER BY sort, created_at LOOP
   sw := CASE WHEN coalesce(r.start_week,0)>0 THEN r.start_week ELSE prev_end+1 END;
   dw := CASE WHEN coalesce(r.duration_weeks,0)>0 THEN r.duration_weeks ELSE 1 END;
   prev_end := sw+dw-1;
   IF r.id=_section THEN
     planned_start := b_start + (sw-1)*7;
     planned_end := planned_start + dw*7 - 3;
     RETURN;
   END IF;
 END LOOP;
END $$;

-- Etapa criada (ou religada) a partir de uma etapa do orçamento recebe as datas dele.
CREATE FUNCTION public.fill_stage_dates_from_budget() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE d record;
BEGIN
 IF new.budget_section_id IS NOT NULL AND new.planned_start IS NULL THEN
   SELECT * INTO d FROM public.budget_section_dates(new.budget_section_id);
   IF d.planned_start IS NOT NULL THEN
     new.planned_start := d.planned_start;
     new.planned_end := coalesce(new.planned_end, d.planned_end);
   END IF;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER work_stages_budget_dates BEFORE INSERT OR UPDATE OF budget_section_id ON public.work_stages
  FOR EACH ROW EXECUTE FUNCTION public.fill_stage_dates_from_budget();

-- Obras que já existem: etapas sem data ganham as do orçamento.
WITH d AS (
  SELECT w.id, x.planned_start, x.planned_end
    FROM public.work_stages w, LATERAL public.budget_section_dates(w.budget_section_id) x
   WHERE w.planned_start IS NULL AND w.budget_section_id IS NOT NULL AND NOT w.removed
)
UPDATE public.work_stages w
   SET planned_start=d.planned_start, planned_end=coalesce(w.planned_end, d.planned_end)
  FROM d
 WHERE d.id=w.id AND d.planned_start IS NOT NULL;

-- Início e término previstos da obra, quando ainda vazios, acompanham as etapas.
UPDATE public.work_registry r
   SET planned_start=coalesce(r.planned_start, x.s), planned_end=coalesce(r.planned_end, x.e)
  FROM (SELECT work_id, min(planned_start) s, max(coalesce(planned_end, planned_start)) e
          FROM public.work_stages WHERE NOT removed AND planned_start IS NOT NULL GROUP BY work_id) x
 WHERE x.work_id=r.id AND (r.planned_start IS NULL OR r.planned_end IS NULL);

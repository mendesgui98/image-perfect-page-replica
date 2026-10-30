-- "Lançar avanço" com "Ajustar etapas seguintes automaticamente": grava as novas datas de várias
-- etapas de uma vez e registra UMA revisão do cronograma (em vez de uma por etapa alterada).
CREATE OR REPLACE FUNCTION public.shift_work_stages(_work_id uuid, _changes jsonb, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb;
BEGIN
  IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  PERFORM id FROM public.work_registry WHERE id=_work_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Obra não encontrada.'; END IF;
  IF EXISTS(SELECT 1 FROM public.work_schedule_versions WHERE work_id=_work_id) AND nullif(trim(_reason),'') IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo da reprogramação.';
  END IF;
  PERFORM set_config('jmg.schedule_batch','on',true);
  FOR c IN SELECT * FROM jsonb_array_elements(coalesce(_changes,'[]'::jsonb)) LOOP
    IF (c->>'planned_end')::date < (c->>'planned_start')::date THEN
      RAISE EXCEPTION 'O término não pode ser antes do início.';
    END IF;
    UPDATE public.work_stages SET planned_start=(c->>'planned_start')::date,
      planned_end=(c->>'planned_end')::date, schedule_change_reason=_reason
    WHERE id=(c->>'id')::uuid AND work_id=_work_id AND NOT removed;
    IF NOT FOUND THEN RAISE EXCEPTION 'Etapa inválida.'; END IF;
  END LOOP;
  PERFORM set_config('jmg.schedule_batch','off',true);
  IF EXISTS(SELECT 1 FROM public.work_schedule_versions WHERE work_id=_work_id) THEN
    PERFORM public.capture_schedule_version(_work_id,_reason);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.shift_work_stages(uuid,jsonb,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.shift_work_stages(uuid,jsonb,text) TO authenticated;

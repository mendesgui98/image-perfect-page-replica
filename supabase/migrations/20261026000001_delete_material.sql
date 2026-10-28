-- Exclusão de material do catálogo.
-- Orçamentos (jsonb materials) e compras (material_key/name) guardam cópias, então não dependem
-- da linha do catálogo. Só a composição de serviços referencia o material: nesse caso a exclusão
-- é bloqueada e informa os serviços para o usuário retirar o material ou desativá-lo.
CREATE POLICY "materials del" ON public.materials FOR DELETE TO authenticated
  USING (public.can_see_costs(auth.uid()));

-- Registra a versão excluída no histórico do catálogo.
CREATE TRIGGER materials_hist_del AFTER DELETE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.log_catalog_change();

CREATE OR REPLACE FUNCTION public.delete_material(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE used text;
BEGIN
  IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  SELECT string_agg(DISTINCT rtrim(s.description, '. '), '; ') INTO used
    FROM public.service_materials sm JOIN public.services s ON s.id = sm.service_id
   WHERE sm.material_id = _id;
  IF used IS NOT NULL THEN
    RAISE EXCEPTION 'Este material faz parte dos serviços: %. Retire-o da composição desses serviços ou desative o material.', used;
  END IF;
  DELETE FROM public.materials WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Material não encontrado.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.delete_material(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_material(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

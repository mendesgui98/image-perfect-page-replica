-- Financeiro: caixa (realizado) separado de contas a receber/pagar (futuro).
-- O caixa continua sendo financial_settlements (baixas). Lançamento à vista cria, de forma
-- atômica, uma conta marcada cash_only e a baixa dela; assim resultado da obra, rateios e
-- painel seguem as mesmas regras. Baixas podem ser desfeitas (auditadas) e um lançamento
-- sem baixas pode ser cancelado por inteiro.

ALTER TABLE public.financial_entries ADD COLUMN cash_only boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.financial_entries.cash_only IS
  'Movimentação à vista: a conta nasce com a baixa e não aparece em contas a receber/pagar.';

-- Conta/banco passa a ser opcional na baixa.
ALTER TABLE public.financial_settlements ALTER COLUMN account_id DROP NOT NULL;

-- Grupo de parcelas fecha o total ou está inteiro cancelado.
CREATE OR REPLACE FUNCTION public.check_financial_group_total() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE gid uuid; target numeric; actual numeric; BEGIN
 IF tg_table_name='financial_groups' THEN gid:=new.id; ELSE gid:=(to_jsonb(new)->>'group_id')::uuid; END IF;
 IF gid IS NULL THEN RETURN new; END IF;
 SELECT total INTO target FROM public.financial_groups WHERE id=gid;
 SELECT coalesce(sum(amount),0) INTO actual FROM public.financial_entries WHERE group_id=gid AND NOT canceled;
 IF actual<>target AND NOT (actual=0 AND NOT EXISTS(SELECT 1 FROM public.financial_entries WHERE group_id=gid AND NOT canceled)) THEN
   RAISE EXCEPTION 'Parcelas devem fechar o total do grupo.';
 END IF;
 RETURN new;
END $$;

-- Parcelas continuam imutáveis; o cancelamento do lançamento inteiro é a única exceção.
CREATE OR REPLACE FUNCTION public.guard_installment_entry() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE o public.purchase_orders; g public.financial_groups; allocated numeric; ignored text[]; BEGIN
 IF new.payable_order_id IS NOT NULL THEN
   SELECT * INTO o FROM public.purchase_orders WHERE id=new.payable_order_id;
   IF NOT FOUND OR new.direction<>'saida' OR new.work_id IS DISTINCT FROM o.work_id OR new.purchase_order_id IS NOT NULL THEN RAISE EXCEPTION 'Parcela de compra inválida.'; END IF;
 END IF;
 IF new.group_id IS NOT NULL THEN
   SELECT * INTO g FROM public.financial_groups WHERE id=new.group_id FOR UPDATE;
   IF NOT FOUND OR new.work_id IS DISTINCT FROM g.work_id THEN RAISE EXCEPTION 'Grupo de parcelas inválido.'; END IF;
   SELECT coalesce(sum(amount),0) INTO allocated FROM public.financial_entries WHERE group_id=g.id AND id<>new.id AND NOT canceled;
   IF NOT new.canceled AND allocated+new.amount>g.total THEN RAISE EXCEPTION 'Parcelas excedem o valor total.'; END IF;
 END IF;
 ignored:=ARRAY['incurred','updated_at','updated_by'];
 IF coalesce(current_setting('jmg.finance_cancel',true),'')='on' THEN ignored:=ignored||'canceled'::text; END IF;
 IF TG_OP='UPDATE' AND (old.group_id IS NOT NULL OR old.payable_order_id IS NOT NULL) AND (to_jsonb(new)-ignored) IS DISTINCT FROM (to_jsonb(old)-ignored) THEN
   RAISE EXCEPTION 'Parcelas preservadas; baixas são registradas separadamente.';
 END IF;
 RETURN new;
END $$;

-- Entrada ou saída à vista: conta + baixa na mesma transação, idempotente pelo _request_id.
CREATE FUNCTION public.register_cash_movement(
  _request_id uuid, _direction text, _movement_date date, _description text, _amount numeric,
  _category text, _payment_method text, _account_id uuid, _work_id uuid, _person_id uuid, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request_id::text,0));
 IF EXISTS(SELECT 1 FROM public.financial_entries WHERE id=_request_id) THEN RETURN _request_id; END IF;
 IF _direction NOT IN ('entrada','saida') OR coalesce(_amount,0)<=0 OR _movement_date IS NULL OR nullif(trim(_description),'') IS NULL THEN
   RAISE EXCEPTION 'Informe tipo, data, descrição e valor.';
 END IF;
 IF _direction='entrada' AND _work_id IS NULL THEN RAISE EXCEPTION 'Selecione a obra do recebimento.'; END IF;
 INSERT INTO public.financial_entries(id,work_id,description,direction,category,person_id,amount,due_date,incurred,payment_method,notes,cash_only)
 VALUES(_request_id,_work_id,trim(_description),_direction,coalesce(nullif(_category,''),'Outras'),_person_id,_amount,_movement_date,_direction='saida',nullif(_payment_method,''),nullif(_notes,''),true);
 INSERT INTO public.financial_settlements(entry_id,account_id,amount,paid_date,payment_method,notes)
 VALUES(_request_id,_account_id,_amount,_movement_date,nullif(_payment_method,''),nullif(_notes,''));
 RETURN _request_id;
END $$;
REVOKE ALL ON FUNCTION public.register_cash_movement(uuid,text,date,text,numeric,text,text,uuid,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_cash_movement(uuid,text,date,text,numeric,text,text,uuid,uuid,uuid,text) TO authenticated;

-- Desfazer baixa: remove a movimentação do caixa (e a conta, se era à vista), com auditoria.
CREATE FUNCTION public.undo_settlement(_settlement_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.financial_settlements; e public.financial_entries; BEGIN
 IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
 SELECT * INTO s FROM public.financial_settlements WHERE id=_settlement_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada.'; END IF;
 SELECT * INTO e FROM public.financial_entries WHERE id=s.entry_id FOR UPDATE;
 IF e.cash_only AND EXISTS(SELECT 1 FROM public.expense_allocations WHERE entry_id=e.id) THEN
   RAISE EXCEPTION 'Esta saída foi rateada entre obras; o rateio impede desfazer.';
 END IF;
 INSERT INTO public.record_deletion_log(entity,record_id,action,snapshot)
 VALUES('financial_settlements',s.id,'permanent',jsonb_build_object('settlement',to_jsonb(s),'entry',to_jsonb(e)));
 DELETE FROM public.financial_settlements WHERE id=s.id;
 IF e.cash_only THEN DELETE FROM public.financial_entries WHERE id=e.id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.undo_settlement(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.undo_settlement(uuid) TO authenticated;

-- Cancelar conta: o lançamento inteiro (todas as parcelas), só sem baixas.
CREATE FUNCTION public.cancel_financial_entry(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.financial_entries; g public.financial_groups; BEGIN
 IF NOT public.can_see_costs(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
 SELECT * INTO e FROM public.financial_entries WHERE id=_entry_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
 IF e.purchase_order_id IS NOT NULL OR e.payable_order_id IS NOT NULL THEN RAISE EXCEPTION 'Conta de compra: altere pelo pedido.'; END IF;
 IF e.group_id IS NOT NULL THEN
   SELECT * INTO g FROM public.financial_groups WHERE id=e.group_id;
   IF g.source<>'manual' THEN RAISE EXCEPTION 'Parcelas do contrato não podem ser canceladas por aqui.'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.financial_settlements s JOIN public.financial_entries x ON x.id=s.entry_id
           WHERE x.id=e.id OR (e.group_id IS NOT NULL AND x.group_id=e.group_id)) THEN
   RAISE EXCEPTION 'Desfaça as baixas antes de cancelar a conta.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.expense_allocations a JOIN public.financial_entries x ON x.id=a.entry_id
           WHERE x.id=e.id OR (e.group_id IS NOT NULL AND x.group_id=e.group_id)) THEN
   RAISE EXCEPTION 'Conta rateada entre obras não pode ser cancelada.';
 END IF;
 PERFORM set_config('jmg.finance_cancel','on',true);
 UPDATE public.financial_entries SET canceled=true
  WHERE NOT canceled AND (id=e.id OR (e.group_id IS NOT NULL AND group_id=e.group_id));
 PERFORM set_config('jmg.finance_cancel','',true);
END $$;
REVOKE ALL ON FUNCTION public.cancel_financial_entry(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_financial_entry(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

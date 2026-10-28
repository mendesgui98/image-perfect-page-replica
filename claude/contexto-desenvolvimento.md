# Contexto de desenvolvimento

Registro das tasks feitas pelo Claude neste repositório. Regras gerais do projeto ficam em `AGENTS.md`.

## Tasks concluídas

### 2026-10-28 — Serviços, avanço e valores por etapa da obra (branch `feat/fundacao-tecnica`)

**Decisões do Guilherme:** gasto real vem do financeiro (saídas com etapa); avanço da etapa ponderado pelo valor dos serviços.

- Migração `20261028000001_stage_services_and_costs.sql`: tabela `work_stage_services` (descrição, MO e material previstos, avanço %), RLS `can_see_costs`, guarda de etapa ativa da mesma obra, auditoria em `work_history` (inclusive exclusão), cascata na exclusão definitiva da obra. `financial_entries.stage_id` validado contra a obra; `guard_installment_entry` permite escolher/trocar a etapa de parcelas.
- Cálculos: `servicesProgress`/`statusForProgress` (work-progress.ts) e `stageCosts` (operations.ts: previsto, gasto pago por MO/material/outros, comprometido, saldo). Avanço calculado é gravado em `work_stages.progress`, então cronograma, painel e relatórios usam o mesmo número.
- Tela: painel por etapa na aba Etapas (cards e lista editável de serviços); avanço manual some quando a etapa tem serviços. Financeiro da obra: "Etapa da obra" ao lançar saída/conta a pagar e seletor de etapa em cada saída.
- Etapas novas já existiam ("Nova etapa") e ficam no cronograma porque é a mesma tabela.

**Testado no navegador** com obra de teste (apagada depois): R$ 2.000 a 50% + R$ 1.000 a 100% → 66,67%; saídas de R$ 1.500 MO + R$ 500 material na etapa → previsto R$ 3.000, gasto R$ 2.000, saldo R$ 1.000.

### 2026-10-28 — Financeiro: caixa separado de contas a receber/pagar (branch `feat/fundacao-tecnica`)

**Modelo (sem mover dados):** `financial_entries` são as contas (futuro) e `financial_settlements` são o caixa (realizado). Decisão do Guilherme: saldo atual inclui o saldo inicial das contas bancárias.

- Migração `20261028000000_cash_and_settlement_undo.sql`: `financial_entries.cash_only` (à vista); `financial_settlements.account_id` opcional; `register_cash_movement` cria conta + baixa atômicas (idempotente); `undo_settlement` remove a baixa (e a conta, se à vista) e grava snapshot em `record_deletion_log`; `cancel_financial_entry` cancela o lançamento inteiro (todas as parcelas) só sem baixas, rateio ou compra. `check_financial_group_total` aceita grupo inteiro cancelado; `guard_installment_entry` só libera `canceled` com `jmg.finance_cancel`.
- Cálculos puros em `operations.ts`: `accountStatus` (pendente, vencida, parcial, recebida/paga, cancelada, vence em até 3 dias), `cashMovements`, `cashSummary` (saldo atual, a receber/pagar e vencidos, previsto). Testes cobrem os critérios de aceite.
- Tela `src/components/works/finance.tsx` (Financeiro geral e aba da obra): cards, abas Caixa / Contas a receber / Contas a pagar, filtros (período, categoria, status, tipo), Nova entrada/saída, Recebi/Paguei (pré-preenchido, parcial), Desfazer baixa, Cancelar.

**Testado:** critérios de aceite no navegador (100 → 100/+200 previsto → 300 → 100; o mesmo para pagar e saída à vista) e cancelamento; dados de teste removidos. `test:db`, build e testes da API passam.

### 2026-10-28 — Excluir e editar obras (branch `feat/fundacao-tecnica`)

**Decisão do Guilherme:** obra usa a lixeira com bloqueio, igual a orçamentos e cadastros.

- Migração `20261027000000_work_trash.sql`: `work_registry` ganhou `deleted_at`/`deleted_by` e o `guard_record_deletion`; `manage_record_deletion` aceita `work_registry`. Lixeira leva junto o cabeçalho do cronograma (mesmo horário) e restaurar traz de volta. Exclusão definitiva só para obra sem financeiro, abertura com valores recebidos/pagos, compras, contrato, registros, extras ou estimativas — a mensagem lista o que impede; apaga cronograma, etapas, versões, abertura, histórico e o espelho legado `works`, guardando tudo no `record_deletion_log`.
- Leitores de lista filtram `deleted_at` (obras, painel, cronogramas, seletores do financeiro, perfil da pessoa). Página da obra na lixeira mostra o aviso de restauração.
- "Editar obra" (antes "Dados da obra") passou a editar cliente, arquiteto, tipo de obra, condições de pagamento e observações; cliente na lixeira continua na lista para não perder o vínculo.

**Testado:** fluxo SQL em transação desfeita (lixeira, bloqueio de edição, restaurar, definitiva, bloqueio por valores) e no navegador com obra de teste (editar, excluir, lixeira, excluir definitivamente).

### 2026-10-27 — Serviço avulso no orçamento (branch `feat/fundacao-tecnica`)

**Problema:** serviços usados só numa obra precisavam ser cadastrados no catálogo; o "Item manual" criava um item vazio e não havia como colocar materiais do catálogo em um item.

**Decisões:**

- "Serviço avulso (só neste orçamento)" no diálogo Adicionar serviço: descrição, unidade, quantidade, custo MO/un e materiais do catálogo (consumo e perda). Vira um `budget_items` com `service_id` nulo; nada entra na tela de Serviços. Sem migração.
- Materiais são snapshots do catálogo via `snapshotMaterial` (`src/lib/item-materials.ts`), o mesmo helper usado ao adicionar serviço do catálogo, com rendimento de embalagem incluído. O cálculo continua em `computeBudget`.
- Qualquer item do orçamento (avulso ou do catálogo) ganhou "+ Material" do catálogo e "Remover material".

**Onde está:** `src/lib/item-materials.ts` (+ `.test.ts`), `src/components/budgets/items-editor.tsx`, `activeMaterialsOptions` em `src/lib/budget-api.ts`. Testado no navegador com orçamento de teste (apagado depois): 30 m² com salva-piso → 2 rolos, custo R$ 800.

### 2026-10-26 — Enter salva formulários (branch `feat/fundacao-tecnica`)

**Problema:** vários diálogos (material, serviço, cadastros, novo orçamento, configurações) tinham `Input`s soltos e o botão Salvar com `onClick`, sem `<form>`; o Enter não fazia nada.

**Decisões:**

- Ouvinte global `EnterToSubmit` (montado em `__root.tsx`) decide o Enter em qualquer `<form>`, pela regra pura `enterIntent` em `src/lib/enter-submit.ts`: salva em texto/número/data/select; textarea só com Ctrl/Cmd+Enter; bloqueia quando o campo tem `aria-expanded="true"` (combobox aberto); ignora Enter já tratado (`defaultPrevented`), repetição da tecla e conteúdo em portal. Usa o primeiro botão `type="submit"`; botão desabilitado ou `aria-busy` não salvam. `data-enter-submit="off"` desliga num formulário.
- Diálogos sem `<form>` passaram a usar `SubmitForm` (`src/components/enter-submit.tsx`), com `pending` para não enviar duas vezes. Todo botão que não salva virou `type="button"` (+ Material, lixeira, Cancelar…).
- Campos de edição em linha que salvam no `onBlur` (itens do orçamento, etapas, avanço do cronograma) usam `commitOnEnter`: Enter só confirma o campo (blur), não submete nada.
- Formulários que já existiam (`DraftForm`, obras, cronogramas, compras etc.) não mudaram de estrutura; só ganharam `type="submit"` explícito. A movimentação de material e o "Adicionar serviço" do orçamento ganharam trava de ocupado contra duplo envio.

**Onde está:** `src/lib/enter-submit.ts` (+ `.test.ts`), `src/components/enter-submit.tsx` (+ `.test.tsx`). Testado no navegador: login, material (Enter no nome e no select), cadastros (Enter na textarea quebra linha; Cmd+Enter salva) e serviços (Enter não aciona "+ Material").

### 2026-10-25 — Rendimento de embalagem dos materiais (branch `feat/fundacao-tecnica`)

**Problema:** material vendido em embalagem (ex.: salva-piso em rolo de 25 m²) era cobrado 1 unidade de compra por unidade de serviço quando a conversão ficava no padrão 1 — 100 m² de proteção viravam 100 rolos.

**Decisões:**

- O vínculo `service_materials` já tinha `consumption` (consumo por unidade) e `loss_pct` (perda %). Por decisão do Guilherme, **reaproveitamos essas colunas** em vez de criar `consumo_por_unidade`/`perda_percentual` duplicadas. O default de `consumption` passou de 0 para 1.
- `materials` ganhou `rendimento_embalagem` (numeric, nulo, > 0) e `unidade_rendimento` (text, nulo — usa a unidade de consumo quando vazio).
- **Arredondamento por serviço** (decisão do Guilherme): `embalagens = ⌈qtd × consumo × (1 + perda/100) ÷ rendimento⌉`, `custo = embalagens × preço da embalagem`. Dois serviços de 30 m² dão 2 + 2 rolos, não 3.
- Rendimento nulo mantém o cálculo antigo (fracionado por `conversion`), então orçamentos existentes não mudam.

**Onde está:**

- Migração: `supabase/migrations/20261025000002_material_package_yield.sql`.
- Cálculo: `src/lib/pricing.ts` — `materialPackages`, `materialPurchaseQty`, `materialCost`. Testes em `pricing.test.ts` (100 m² → 4, 30 m² → 2, 100 m² + 10% → 5, arredondamento por serviço, sem rendimento).
- Snapshot do item (`budget_items.materials`): campos `package_yield` e `yield_unit`, copiados do catálogo ao adicionar o serviço ao orçamento.
- UI: campos no cadastro de material (`materiais.tsx`); exemplo "100 m² → N rolos" na composição do serviço (`servicos.tsx`); linha do item mostra "100 m² → 4 rolo" (`items-editor.tsx`); resumo de materiais e consolidação de compras (`operations.ts`) somam as embalagens por serviço.

**Pendências:**

- Migração não aplicada em banco local nesta sessão (Docker indisponível no PATH). Rodar `npm run stack:up` / `npm run db:migrate` para conferir.
- Itens de orçamento já criados não recebem o rendimento retroativamente (é snapshot); para aplicar, readicionar o serviço ao orçamento.

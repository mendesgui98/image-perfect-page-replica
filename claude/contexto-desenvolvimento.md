# Contexto de desenvolvimento

Registro das tasks feitas pelo Claude neste repositório. Regras gerais do projeto ficam em `AGENTS.md`.

## Tasks concluídas

### 2026-10-28 — Revisão aprovada atualiza os serviços das etapas da obra (branch `feat/fundacao-tecnica`)

**Decisão do Guilherme:** ao aprovar a revisão, as etapas da obra acompanham o orçamento novo.

- Migração `20261028000006_revision_syncs_stage_services.sql`: `budget_items.origin_item_id` (linhagem copiada por `copy_budget` só em revisões; duplicar não leva) e `work_stage_services.budget_item_id` (gravado por `convert_budget`). Nova `sync_budget_stage_services(_budget_id, _services)`: cria etapa para grupo novo, atualiza custo/descrição/etapa mantendo o avanço, cria serviços novos, apaga os que saíram (auditado); serviços manuais ficam.
- Front: `syncBudgetStages` (work-budget.ts) roda depois de registrar a aprovação (approval.tsx), com custo de `computeBudget`, e recalcula o avanço das etapas com `syncStageProgress`. Falha na sincronização aparece em aviso sem desfazer a aprovação; pode ser rodada de novo (idempotente).
- Testado no banco (transação desfeita: Tomadas com novo custo e 50% mantidos, Quadro removido, Hidráulica nova, manual intacto, segunda execução sem mudanças) e no navegador (converter em obra → reabrir → Tomadas 10→20 e tirar Quadro → aprovar: obra na Rev. 1, Tomadas R$ 1.000, Quadro fora). Dados de teste apagados.
- Obras convertidas antes desta migração não têm `budget_item_id`; seus serviços não são atualizados por revisões.

### 2026-10-28 — Custo da etapa no formulário e campos em reais (branch `feat/fundacao-tecnica`)

**Pedido do Guilherme:** o valor da etapa e dos materiais vai no formulário da etapa (junto de datas e responsável), não no card; o card fica só com os totais. Valores digitados aparecem como moeda.

- `MoneyInput` (`src/components/money-input.tsx`) + `parseBRL`/`maskBRL`/`moneyText` (`src/lib/money.ts`, testados): dígitos viram centavos ("1000000" → "R$ 10.000,00").
- Formulário da etapa (`schedule.tsx`, `StageCostFields`): "Valor da etapa (mão de obra / serviço)" e "Valor dos materiais da etapa" para admin/financeiro; gravados com `saveStageValues` ao salvar a etapa. Com serviços na etapa mostra a soma deles em vez dos campos.
- Card (`stage-services.tsx`): só previsto, já pago, restante e contas em aberto; MO/material dos serviços também em reais.
- Conferido no navegador: etapa existente abre com "R$ 2.825,00"; etapa de teste salva R$ 10.000 + R$ 5.000 e foi removida depois.

### 2026-10-28 — Reabrir orçamento aprovado para edição (branch `feat/fundacao-tecnica`)

**Decisão do Guilherme:** opção A — o aprovado continua imutável; "Reabrir para edição" cria a revisão e, ao aprovar de novo, ela substitui a anterior. Com contrato assinado, a mudança vira aditivo.

- Migração `20261028000004_budget_superseded_status.sql`: novo status `substituido` (sozinho porque o valor do enum só vale após o commit).
- Migração `20261028000005_budget_reopen_revision.sql`: `budgets.superseded_by`; `guard_budget_locked` trava também `substituido` e só aceita aprovado → substituído vindo do gatilho (`jmg.budget_supersede`); `registry_guard` deixa trocar `linked_budget_id` só nesse gatilho e dentro da mesma família; gatilho `supersede_previous_budget` (ao aprovar) marca a versão anterior, religa obra e etapas (grupo de mesmo nome), registra `budget_history` e recusa se a obra tiver contrato assinado; `convert_budget` devolve a obra já ligada à família (nunca cria segunda obra).
- Front: `isLockedStatus`, `openRevision`, `approvedVersion` (budget-status.ts, testados) e `budgetFamilyOptions` (budget-api.ts). Tela do orçamento: botão "Reabrir para edição" no aprovado (reaproveita revisão em aberto), aviso "Ao aprovar, esta revisão substitui a Rev. N" na revisão, e "Substituído pela Rev. N" com link na versão antiga.
- Testado no banco (transação desfeita: edição direta bloqueada, substituição, obra e etapa religadas, contrato assinado bloqueia) e no navegador com orçamento nº 99990 (reabrir → remover serviço → aprovar com comprovante → Rev. 0 "Substituído", obra na Rev. 1); dados de teste apagados.

**Limites:** contrato "gerado" ainda não assinado guarda o texto antigo e precisa ser gerado de novo. (Serviços das etapas: resolvido na task seguinte.)

### 2026-10-27 — Valor da etapa e dos materiais digitados na obra (branch `feat/fundacao-tecnica`)

**Pedido do Guilherme:** na obra feita do zero, digitar o valor da etapa (ex.: R$ 10.000) e o valor dos materiais, para calcular quanto já foi pago e quanto falta de cada um; "peso" passa a se chamar avanço.

- Migração `20261028000002_stage_planned_values.sql`: tabela `work_stage_values` (uma linha por etapa: `labor_planned`, `material_planned`), RLS `can_see_costs`, guarda de etapa ativa da mesma obra, auditoria em `work_history`, cascata com etapa/obra.
- `stageCosts` (operations.ts) recebe o valor digitado; com serviços na etapa, o previsto é a soma deles e o digitado não entra (sem dupla contagem). Novos campos `fromServices`, `laborBalance`, `materialBalance`. Testes: R$ 10.000 + R$ 5.000 com R$ 4.000/R$ 2.000 pagos → restante R$ 6.000/R$ 3.000; outras categorias só reduzem o total.
- Card da etapa (`stage-services.tsx`): campos "Valor da etapa (mão de obra / serviço)" e "Valor dos materiais da etapa" (salvam ao sair do campo/Enter; travados mostrando a soma quando há serviços); previsto, já pago e restante separados em etapa e materiais.
- "Peso" renomeado: "Avanço: vale X% da obra" no card e no relatório, "Avanço distribuído" no topo, "Avanço (% da obra)" nos formulários.
- Conferido no navegador com etapa de teste (removida depois). Corrigido: salvar os dois campos em sequência apagava o primeiro; agora cada campo grava só o próprio valor.

### 2026-10-27 — Orçamento vira obra já com serviços e custos nas etapas (branch `feat/fundacao-tecnica`)

**Decisão do Guilherme:** o previsto da etapa vindo do orçamento é o **custo** (o que a JMG paga), não o preço de venda.

- Migração `20261028000003_convert_budget_stage_services.sql`: `convert_budget(_budget_id, _services jsonb default '[]')` substitui a versão de um argumento. Cria um `work_stage_services` por item do orçamento, na etapa do seu grupo (`budget_section_id`), com MO e materiais do custo; descrição/ordem vêm do banco e item de outro orçamento é recusado. Tudo na transação da conversão.
- Front: `convertBudgetToWork` (work-budget.ts) carrega o orçamento, roda `computeBudget` e manda `budgetStageServices(result.items)` (operations.ts, testado). Usado na aprovação do orçamento e em "Nova obra a partir de orçamento".
- Testado no banco (transação desfeita): 3 itens em 2 grupos → serviços nas etapas Elétrica/Pintura com os custos; reconverter devolve a mesma obra; item estranho → "Serviço não pertence a este orçamento.". API responde com e sem `_services`.
- Obras já convertidas antes disso não recebem os serviços retroativamente.

### 2026-10-27 — Etapas da obra num card só (branch `feat/fundacao-tecnica`)

**Pedido do Guilherme:** os valores ficavam num quadro separado embaixo da etapa, com uma barra de avanço no meio; juntar tudo e tirar a barra.

- `schedule.tsx`: cada etapa virou um card (borda, fundo `bg-card`, espaço entre cards). A barra de avanço só aparece quando o quadro de valores não aparece (cronograma ou usuário sem acesso a custos).
- `stage-services.tsx`: valores dentro do card, separados por uma linha: "Valor previsto", "Já pago" (com % do previsto), "Restante a pagar" (previsto − pago, em vermelho quando estoura) e "Contas em aberto". Barra de gasto removida; cálculos continuam em `stageCosts`.
- Conferido no navegador com um serviço de teste (apagado depois): R$ 1.500 MO + R$ 800 material → previsto e restante R$ 2.300.

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

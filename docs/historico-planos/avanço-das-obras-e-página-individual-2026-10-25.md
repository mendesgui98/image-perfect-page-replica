# Avanço das obras e página individual

## Objetivo
Completar o acompanhamento de cada obra sem criar outro painel geral nem alterar os cálculos financeiros já validados.

## 1. Obras e navegação
- Mostrar barras separadas de **Avanço físico** e **Avanço financeiro**, junto de cliente, status, valor, recebido, saldo e prazo.
- Manter o caminho Painel → obras que compõem o indicador → Visão Geral da obra. A listagem e a busca também abrem essa mesma página.

## 2. Visão Geral da obra
- Priorizar cliente, situação, início, previsão de término, prazo, comparação dos avanços e pendências principais.
- Mostrar contrato original, aditivos aprovados, valor atualizado, recebido, a receber, despesas pagas, contas a pagar, caixa, resultado atual e previsto.
- Tornar os valores clicáveis, com composição exata e acesso ao registro de origem. Diferenciar resultado econômico de caixa e manter “Não conferido” quando faltar estimativa válida.
- Usar o critério financeiro existente: **recebido ÷ valor atualizado do contrato**. Mostrar o consumo dos custos previstos separadamente; não confundir os dois percentuais.
- Sinalizar recebimentos abaixo do avanço físico, consumo de custos acima do avanço físico e prazos vencidos, sem bloquear operações. Não inventar tolerâncias percentuais.

## 3. Etapas, fotos e cronograma
- Reutilizar as etapas e o cálculo ponderado existentes, corrigindo a criação da primeira etapa quando não houver etapas.
- Abrir o detalhe de uma etapa com status, execução, peso, datas, responsável, observações, pendências, serviços executados e próximos serviços.
- Permitir atualização rápida do percentual no celular e anexar múltiplas fotos à etapa, preservando data e autoria.
- Manter a posição inicial de obras em andamento como referência imutável; obras sem etapas continuam mostrando o avanço inicial, sem apagar esse histórico.
- Reutilizar as fotos e registros nos relatórios e na aba Fotos, sem cadastrá-los novamente.

## 4. Organização das abas
Visão Geral | Etapas | Financeiro | Cronograma | Compras | Aditivos | Fotos | Relatórios | Documentos.

Preservar também os recursos atuais de contrato, diário, entrega, assistência e decisões. As abas financeiras continuam restritas aos perfis autorizados.

## Validação
- Testar média ponderada, referência inicial, comparação dos avanços e composição dos valores.
- Validar com uma obra piloto identificada: abrir pelo indicador geral, atualizar etapa, anexar foto, reabrir a obra, conferir relatório e abrir um recebimento até sua origem.
- Conferir a página e as atualizações no computador e no celular, sem alterar obras reais.
- Permissões de financeiro/equipe permanecem dependentes de contas desses perfis para a conferência autenticada completa.

## Detalhes técnicos
- Reutilizar `work_registry`, `work_stages`, `work_records`, `dashboard-data`, as composições executivas e os editores existentes.
- Acrescentar somente campos e vínculos necessários às etapas/fotos, mantendo acesso protegido, histórico de alterações e arquivos privados com links temporários.
- Cálculos econômicos continuam em `pricing.ts`; cálculos operacionais e comparação de avanços usam funções puras testadas.
- Nenhum percentual, nome ou valor ilustrativo do complemento será cadastrado como informação real da JMG.
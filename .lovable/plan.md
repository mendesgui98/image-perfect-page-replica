# Complemento JMG — painéis financeiros e gestão de obras

## Objetivo
Mostrar quanto cada obra vale, quanto recebeu e pagou, seus valores pendentes, caixa e resultado econômico, além da situação consolidada da JMG. Evoluir o que já funciona, sem reconstruir a plataforma.

## 1. Base financeira confiável e parcelamento
- Reaproveitar orçamento aprovado, cliente, endereço, etapas, descontos e condições de pagamento na obra, mantendo a conversão única.
- Permitir conferir os vencimentos das condições de pagamento antes de gerar as contas a receber; não inventar datas ausentes.
- Criar compras e despesas parceladas com valores e vencimentos individuais, mantendo uma única origem da despesa e impedindo geração duplicada.
- Completar lançamentos e baixas com forma de pagamento, parcela, observações, comprovante e centro de custo. Exigir obra para lançamentos específicos; despesas gerais da empresa continuam identificadas e podem ser rateadas.
- Calcular automaticamente previsto, parcial, recebido/pago e vencido pelo saldo e pela data, sem marcação manual incoerente.
- Separar despesas pagas, custos incorridos, compromissos futuros e estimativa para concluir; nunca confundir caixa com lucro.

## 2. Visão geral de cada obra
- Abrir a obra em **Visão Geral**, antes das abas existentes.
- Mostrar cliente, localização, datas e status; contrato original, extras/aditivos aprovados e total atualizado; recebido, saldo contratual a receber, parcelas futuras/vencidas, despesas pagas, contas a pagar e caixa.
- Exibir custo incorrido, compromissos e resultado econômico projetado separadamente; identificar estimativas ainda não conferidas.
- Mostrar avanço físico ponderado e avanço financeiro recebido sobre o contrato atualizado.
- Manter atalhos para financeiro, compras, cronograma, fotos/diário, relatórios, documentos e aditivos, sem remover telas atuais.

## 3. Painéis geral e consolidado
- Ampliar a lista de obras com todos os indicadores financeiros e operacionais pedidos, em comparação rápida no computador e apresentação legível no celular.
- Criar visão consolidada com obras ativas, contratos, aditivos, recebimentos, saldo a receber, despesas, contas a pagar/receber, caixa, resultado acumulado e previsto.
- Separar caixa das obras do saldo das contas da empresa; considerar despesas gerais e rateios sem somá-los duas vezes.
- Filtros: hoje, semana, mês, trimestre, ano, período personalizado, obra, cliente, categoria e status.
- Aplicar períodos a movimentos pelas datas efetivas e a previsões pelos vencimentos; apresentar valores de contrato como posição acumulada, sem escondê-los indevidamente pelo filtro de pagamentos.
- Gráficos: entradas/saídas, caixa mensal, receitas/despesas por obra, despesas por categoria, resultado por obra, previsto/realizado e evolução financeira.
- Destacar obras mais lucrativas, com maiores custos e pagamentos atrasados. Usar dados reais; os números ilustrativos do documento não viram cadastros reais.

## 4. Uso em obra e proteção do preenchimento
- Manter a obra e filtros selecionados entre telas; oferecer busca nos cadastros existentes e ações rápidas de entrada/saída.
- Formulários curtos, botões grandes, valores legíveis e tabelas adaptadas ao celular.
- Salvar rascunhos automaticamente com indicação clara de rascunho/salvo; preservar preenchimento após falha de conexão e reabertura.
- Confirmar lançamentos financeiros explicitamente, evitando enviar pagamentos ou duplicá-los ao reconectar. Proteger anexos e rascunhos por usuário.
- Manter custos e resultados restritos a administrador/financeiro, inclusive nas consultas e gráficos; equipe vê somente informações operacionais permitidas.

## 5. Obra piloto — condição para liberar e ampliar
Criar uma obra claramente marcada **PILOTO — TESTE**, sem misturar seus números aos resultados reais. Validar e corrigir os fluxos relacionados antes de prosseguir para novos módulos ou melhorias:
1. Cliente → orçamento com desconto → comissão somente na mão de obra após descontos → PDF.
2. Aprovação comprovada → contrato → conversão única, mantendo os vínculos e informações existentes.
3. Compra de R$ 12.000 em quatro parcelas de R$ 3.000, com baixas individuais.
4. Parcela de R$ 20.000 com recebimento de R$ 10.000 e saldo de R$ 10.000.
5. Cenário de contrato de R$ 300.000, recebido de R$ 150.000 e pago de R$ 100.000: caixa de R$ 50.000, sem tratar esse valor como lucro.
6. Pagamentos/recebimentos, custos incorridos, compromissos e estimativas refletidos nos painéis sem dupla contagem.
7. Avanço físico, fotos e relatório; reabertura do sistema com leitura dos dados preservados.
8. Verificação de administrador, financeiro e equipe, incluindo tentativas de acesso indevido aos dados financeiros.

## Detalhes técnicos
- Manter cálculos econômicos puros e testados em `pricing.ts`; caixa, parcelas e agregações operacionais em helpers testados, sem fórmulas duplicadas nos gráficos.
- Evoluir o banco de forma aditiva, com políticas de acesso, permissões explícitas, histórico e operações atômicas para parcelamento e geração de recebíveis.
- Unificar os dados de resumo usados nos painéis por obra e consolidado, com invalidação após compras, recebimentos, pagamentos, aditivos e alterações de avanço.
- Persistir filtros e obra na navegação; verificar telas, pagamentos parciais, permissões, reconexão e reabertura no navegador, além dos testes de cálculo.
- Testar cada módulo ao entregá-lo; a validação integral da obra piloto é o critério de liberação, não apenas a ausência de erros nas páginas.

## Limites e dependências
Não inclui portal do cliente, emissão fiscal ou conexão bancária automática. Percentuais, tributos, dados comerciais e cláusulas reais dependem dos dados da JMG; nenhuma alíquota será presumida. Não chamar faturamento fiscal de recebimento: sem emissão de nota, o indicador será identificado como **Recebido**. Resultado acumulado será identificado como contrato atualizado menos custos incorridos registrados; resultado previsto também inclui compromissos e estimativa para concluir, sem presumir regime contábil ou reconhecimento fiscal de receitas.
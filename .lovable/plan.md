# Cadastro de obras — duas formas de entrada

## Resultado
Adicionar **+ Nova obra** no módulo Obras com duas opções:
- **Criar a partir de orçamento aprovado**: selecionar proposta existente e reutilizar a conversão única, mantendo o orçamento consultável.
- **Cadastrar obra diretamente**: criar uma obra real sem orçamento fictício, para contratos externos, obras antigas ou em andamento.

As duas opções chegam às mesmas telas de gestão e entram juntas nos indicadores da JMG. A origem fica registrada apenas para rastreabilidade.

## Cadastro direto
- Nome, cliente existente, endereço, tipo, datas, status, responsável, condições de pagamento e observações.
- Valores original e de aditivos existentes, com total atualizado calculado.
- Pergunta **“Esta obra já está em andamento?”** e posição inicial com data de referência: recebido anteriormente, despesas já realizadas, contas a pagar e avanço físico.
- Saldo contratual a receber calculado a partir do contrato atualizado e do recebido anterior.
- Anexos de contratos/documentos e fotos, guardados de forma privada.
- Etapas e materiais poderão ser cadastrados na gestão sem depender de itens de orçamento.

## Posição inicial e gestão financeira
- Manter os valores anteriores identificados separadamente dos movimentos posteriores; não inventar pagamentos, datas, contas ou histórico.
- Caixa inicial da obra = recebido anterior menos despesas pagas anteriores; resultado econômico continua separado do caixa.
- Diferenciar despesas pagas de custos incorridos e registrar estimativa restante como não confirmada quando desconhecida.
- Contas pendentes podem ser detalhadas em parcelas; geração de recebíveis considera apenas o saldo ainda não recebido.
- Permitir detalhamento individual do histórico anterior com substituição/reconciliação da posição inicial, nunca soma duplicada.
- Preservar rascunhos e exigir nova seleção de arquivos quando o preenchimento for recuperado.

## Preservação do fluxo atual
- Manter conversão sem duplicação e vínculo ao orçamento aprovado.
- Aproveitar os dados disponíveis do orçamento; não preencher cronograma ou responsáveis que não tenham sido informados.
- Adaptar contrato, compras, resumo, aditivos, relatórios e consolidado para funcionar sem orçamento vinculado.
- Contratos existentes anexados não são reescritos; novos contratos continuam usando o modelo fornecido, com conferência dos dados reais.

## Validação
- Testar uma obra direta isolada: contrato de **R$ 300.000**, recebido anterior de **R$ 120.000**, despesas pagas anteriores de **R$ 75.000**, saldo a receber de **R$ 180.000**, caixa de **R$ 45.000** e avanço de **40%**.
- Registrar novo recebimento e pagamento e verificar leitura na obra e no consolidado, sem duplicar posição inicial.
- Testar compra parcelada, etapas, fotos, documentos, relatório e cadastro a partir de orçamento aprovado.
- Confirmar que orçamento fictício não é criado e que dados piloto não entram nos indicadores reais por padrão.
- Testes automatizados para valores, limites, idempotência e reconciliação; conferir controles de acesso. Testes autenticados de financeiro/equipe dependem de contas desses perfis, ainda ausentes.

## Detalhes técnicos
- A estrutura atual exige orçamento em toda obra. Usar evolução aditiva para permitir vínculo opcional, preservando os identificadores das obras e registros existentes, sem remover campos ou fabricar propostas.
- Registro principal comum às duas origens; transferência dos vínculos operacionais e compatibilidade da conversão atual em uma alteração transacional.
- Criação direta e posição inicial atômicas, com proteção contra repetição e auditoria; permissões de custos mantidas para admin/financeiro.
- Fórmulas econômicas em `pricing.ts`; caixa, posição inicial e reconciliação em helpers puros testados. Consultas compartilhadas alimentam obra e consolidado.

Não inclui importação automática de planilhas de formato desconhecido, nem definição de tributos ou condições comerciais não fornecidas.
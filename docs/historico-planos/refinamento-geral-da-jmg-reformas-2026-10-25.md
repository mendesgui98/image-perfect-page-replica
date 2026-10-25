# Refinamento geral da JMG Reformas

## Objetivo

Organizar a plataforma em uma visão executiva e módulos conectados, sem apagar dados nem retirar funções existentes. Cada indicador permitirá descobrir sua composição e chegar ao registro de origem.

## Auditoria inicial

- **Painel, Obras e resultados e Obras** apresentam o mesmo dashboard financeiro completo. O Painel ainda acrescenta contadores de cadastros e propostas recentes, sobrecarregando a primeira tela.
- **Obras** precisa voltar a ser uma lista operacional. A visão específica de cada obra já reúne cronograma, diário, contrato, compras, financeiro, aditivos, documentos e relatórios: reutilizar esse ambiente.
- **Cadastros** já centraliza clientes, arquitetos e fornecedores, mas abre somente a edição cadastral; faltam perfis com vínculos e histórico.
- **Contratos** já existem dentro das obras, mas não têm uma lista central. A nova lista deve levar aos contratos existentes, não criar outro editor.
- **Orçamentos** já têm lista, edição, aprovação e conversão; enriquecer essa lista em vez de duplicar o módulo.
- Os indicadores atuais são estáticos e vários gráficos se repetem. Consolidar as análises financeiras no Financeiro e criar detalhamentos compartilhados.

## 1. Navegação e tela inicial

- Tornar **Painel** a única visão executiva inicial, com nove indicadores principais: obras ativas, valor ativo, aditivos, recebido, a receber, despesas, a pagar, caixa e resultado.
- Priorizar no celular obras ativas, recebido, a receber, a pagar, caixa e resultado; informações secundárias abaixo.
- Retirar “Obras e resultados” do menu. Manter seu endereço antigo funcionando e encaminhando à visão consolidada adequada, preservando filtros.
- Manter alertas comerciais importantes, mas sem contadores de cadastros ou listas repetidas no topo.
- Oferecer busca global por obras, pessoas, orçamentos e contratos, com resultados que abram a origem.

## 2. Indicadores com composição exata

- Cada indicador abre uma lista de composição com filtros, total e links para os registros relacionados.
- Recebido e despesas: data, obra, pessoa, descrição, parcela, valor e forma de pagamento. Separar explicitamente posições iniciais de movimentos posteriores.
- A receber e a pagar: parcelas, vencimentos, baixas e saldo; valores ainda sem parcelas ficam identificados, sem inventar vencimentos.
- Aditivos: obra, cliente, descrição, valor, data e status. Mostrar recebimentos vinculados somente quando essa ligação existir; não atribuir pagamentos gerais a um aditivo por suposição.
- Caixa: entradas e saídas com sinais e composição. Diferenciar caixa das obras de saldos das contas bancárias.
- Resultado: composição por obra, custos e estimativas; continuar exibindo “Não conferido” quando faltar estimativa de conclusão em obra direta.
- Uma mesma composição alimenta o indicador e seu detalhamento. A soma deve fechar exatamente, inclusive com posição inicial, recebimentos parciais e exclusão de pilotos.
- Filtros de período afetam movimentos datados. Contratos, avanço e demais posições acumuladas têm identificação explícita, sem fingir que são movimentos do mês.

## 3. Obras e Financeiro com funções próprias

- **Obras:** tabela limpa com obra, cliente, status, avanço, valor, recebido, saldo e término; busca e filtros Ativas, Em planejamento, Pausadas, Finalizadas e Todas.
- Preservar **Nova obra** nas duas modalidades e todos os módulos da obra.
- Links podem abrir diretamente Financeiro, Contrato, Aditivos ou Documentos da obra, preservando seleção e filtros.
- **Financeiro:** concentrar lançamentos, recebimentos, pagamentos, contas, transferências, rateios, resultados e gráficos úteis em vistas distintas. Não repetir a visão executiva integral.
- Reutilizar fotos do diário e relatórios existentes, evitando outro cadastro de imagens.

## 4. Pessoas, orçamentos e contratos

- Reorganizar os cadastros existentes em listas por finalidade, mantendo contatos e prestadores acessíveis.
- **Clientes:** perfil com dados, obras atuais/anteriores, propostas, contratos, valores e links para documentos e histórico.
- **Arquitetos:** obras e clientes vinculados, propostas e comissão prevista/paga/pendente, respeitando a comissão somente sobre mão de obra após descontos. Não inferir indicações ou comissões sem vínculo comprovado.
- **Fornecedores:** dados, compras, obras atendidas, documentos, pagamentos e contas pendentes.
- **Orçamentos:** acrescentar projeto, valor e filtros de status; apresentar “Convertido em obra” quando houver vínculo. Preservar todos os estados e ações atuais. “Em negociação” só será exibido como estado próprio se já houver informação persistida que o sustente; não alterar regras de aprovação nesta revisão visual.
- **Contratos:** lista central de contratos existentes com cliente, obra, valor, data e status; abrir o editor/documentos atuais e oferecer “Ver financeiro da obra”.

## Validação

- Testar igualdade entre cada indicador e a soma de seu detalhamento, incluindo posição inicial, pilotos, descontos, parcelas, baixas parciais e filtros.
- Exercitar autenticado: Painel → composição → obra → financeiro; Cliente → obra → contrato; Fornecedor → compra → pagamento.
- Verificar que cadastro direto e conversão de orçamento continuam funcionando e que custos não aparecem em documentos do cliente.
- Conferir desktop e celular, legibilidade, tabelas, menus, filtros ativos e ausência de conteúdo sobreposto.
- Testes completos dos perfis financeiro/equipe continuam dependendo de contas desses perfis; não afirmar que foram verificados com a conta admin.

## Detalhes técnicos

- Refatoração predominantemente de apresentação e navegação, reutilizando consultas, registros e componentes existentes; nenhuma exclusão ou migração destrutiva.
- Criar seletores puros compartilhados para composição dos indicadores e testes de valores concretos; manter cálculos econômicos em `pricing.ts`.
- Manter políticas de acesso, snapshots, auditoria, contratos assinados e orçamentos aprovados imutáveis.
- Usar URLs para filtros e seleção de módulos; manter endereços antigos e metadados próprios nas páginas de conteúdo.
- Implementar em blocos: navegação/Painel/Obras, detalhamentos/Financeiro, perfis/listas comerciais, validação integrada.

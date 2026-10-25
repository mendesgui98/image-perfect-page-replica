# Correções de integridade — 25/10/2026

A branch `fix/jmg-audit-integrity` trata os 11 achados prioritários da análise do commit `62b741f`.

## Alterações

1. Saldo das contas ignora baixas sem lançamento no recorte, sem transformar entradas de pilotos excluídos em saídas. O recorte de pilotos continua sendo aplicado pelo dashboard.
2. Cadastro cria somente o perfil de usuário. A liberação depende de atribuição explícita de função pelo administrador. Usuários sem função veem a mensagem de espera e as políticas bloqueiam dados da empresa. Perfis existentes são preservados; usuários aprovados como equipe mantêm o acesso operacional compartilhado anterior.
3. Orçamentos nascem em elaboração. Aprovação continua por atualização com data e evidência obrigatórias.
4. Uma política restritiva impede apagar anexos referenciados por orçamentos, contratos, extras, registros, compras e financeiro, inclusive pelo proprietário. Arquivos órfãos continuam sujeitos às políticas normais.
5. Chave composta garante que item e seção pertençam ao mesmo orçamento.
6. Despesas rateadas não podem ser reduzidas abaixo da soma atribuída, canceladas ou convertidas em lançamentos incompatíveis. Rateios novos exigem despesa geral ativa.
7. A posição inicial usa a obra selecionada também quando ela vem do filtro da tela financeira geral.
8. Leitura de versões preserva datas reais, avanço e situação presentes no snapshot avulso.
9. Revisões são serializadas pelo orçamento raiz e possuem identificação comercial única.
10. Serviço e composição passam a ser salvos por uma única função transacional; falhas revertem o conjunto. O catálogo completo em cache também é atualizado.
11. Datas de negócio usam America/Sao_Paulo em vencimentos, indicadores e cronogramas. Cálculos de duração continuam usando dias de calendário.

Os títulos distinguem resultado das obras e resultado da empresa. A tela de lançamentos explica que seu recorte é por vencimento, e que caixa por data efetiva fica em Recebimentos e saldos. Os efeitos das configurações também tiveram seus retornos corrigidos para atender à checagem de tipos.

## Aplicação

Aplicar `0015_audit_integrity.sql` antes de disponibilizar a nova interface: o editor de serviços passa a depender de `save_service_composition`. A migração não foi aplicada no ambiente publicado por esta tarefa.

As novas restrições recusam dados legados inconsistentes: itens em seção de outro orçamento ou números/revisões repetidos precisam de revisão humana antes da migração. Não há correção automática que mova itens ou renumere propostas aprovadas.

Em uma instalação nova, criar a primeira conta no Auth e atribuir a ela o perfil administrador por uma conexão administrativa confiável. Não existe mais promoção automática do primeiro cadastro. Em instalações atuais, manter pelo menos um administrador já aprovado.

Verificar no ambiente de destino: bucket privado `jmg-documents`, política de cadastro/confirmação de e-mail e se existem outras políticas personalizadas. A retenção nova é restritiva para DELETE e não depende de remover políticas permissivas adicionais.

Para verificar antes de aplicar, estas consultas devem retornar zero linhas:

```sql
SELECT i.id, i.budget_id, i.section_id
FROM public.budget_items i
JOIN public.budget_sections s ON s.id=i.section_id
WHERE i.budget_id<>s.budget_id;

SELECT number, revision, count(*)
FROM public.budgets
GROUP BY number,revision HAVING count(*)>1;
```

## Validação

- `npm test`: testes de cálculo, snapshots, data de negócio, rascunhos, composições e navegação.
- `npm run test:db`: PostgreSQL embutido PGlite, com serviços Auth/Storage mínimos de teste, aplica todas as migrações e testa autorização por perfil, aprovações, retenção, rateios, revisões, conversão e rollback da composição.
- `npx tsc --noEmit`: verificação de tipos.
- `npm run build`: compilação de produção.
- `npm run lint`: o repositório contém problemas anteriores de formatação/lint; conferir os arquivos alterados separadamente e não confundir isso com a aprovação do lint global.

PGlite verifica SQL real em ambiente isolado, mas não substitui o teste final das APIs de Auth/Storage e da interface autenticada no Supabase de destino. A unicidade de revisões foi exercitada; a disputa entre sessões concorrentes deve ser conferida também em PostgreSQL de homologação.

## Melhorias adicionais ainda fora desta correção

Paginação de grandes conjuntos, conciliação de posições iniciais com contas, política de acesso por obra individual, limpeza transacional de uploads órfãos, aprovação posterior de extras, provisionamento integral do ambiente e revisão visual/jurídica dos documentos continuam como evoluções próprias. Não foram introduzidas mudanças nas fórmulas comerciais, atualização automática do cronograma por aditivo ou migração de permissões dos usuários existentes.

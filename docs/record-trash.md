# Exclusão, lixeira e restauração

Orçamentos, contratos, cronogramas e todos os tipos de cadastro (clientes, contatos, arquitetos, fornecedores e prestadores) possuem a ação **Excluir** e uma **Lixeira** própria. As ações são restritas a administradores.

## Fluxo

1. Clique em Excluir na lista ou no registro.
2. Confira o nome e digite EXCLUIR para confirmar.
3. O registro sai das listas, buscas e seletores novos e fica disponível na Lixeira do módulo.
4. Na Lixeira, escolha Restaurar ou Excluir definitivamente. A exclusão definitiva exige outra confirmação e não pode ser desfeita pela interface.

Arquivar e excluir são estados diferentes: os filtros de arquivados não mostram a lixeira. Restaurar preserva o estado anterior (inclusive arquivado, assinado, aprovado ou modelo).

Contratos assinados e orçamentos aprovados também podem ir para a lixeira. A ação não modifica seus textos, preços ou versões; a proteção contra edição continua válida ao restaurar.

## Vínculos e histórico

Excluir um documento não exclui a obra nem lança ou cancela valores financeiros. Nomes e valores usados por obras existentes continuam disponíveis para manter cálculos e documentos históricos consistentes.

A exclusão definitiva de um cliente/cadastro com vínculos é bloqueada pelo banco e informa os tipos de vínculo. O mesmo vale para orçamento convertido em obra, usado por cronograma ou que possua revisões. É necessário resolver esses vínculos ou manter o registro na lixeira. Nenhuma remoção em cascata de obras ou financeiro é executada.

A exclusão definitiva do cabeçalho de cronograma vinculado remove sua entrada no módulo Cronograma e mantém as etapas, avanço e histórico da obra. Uma edição posterior da obra não recria automaticamente o cabeçalho; uma nova criação explícita de cronograma pode reaproveitar as etapas da obra.

O banco registra quem enviou, restaurou e excluiu definitivamente, com a versão do registro anterior à ação. O histórico de auditoria é mantido e acessível somente ao administrador. Arquivos no armazenamento não são removidos automaticamente: isso evita apagar um comprovante compartilhado por outro registro.

## Instalação

Aplicar `drizzle/migrations/0016_record_trash.sql` **depois de 0015** e antes de usar esta interface. A migração adiciona os campos da lixeira, a função `manage_record_deletion`, os bloqueios e a auditoria. Ela não exclui registros existentes. Atualizar apenas a interface sem a migração causará erros de coluna/função ausente.

A implementação foi preparada e testada em banco isolado; aplicar ao Supabase do projeto requer uma conexão administrativa do ambiente de destino.

## Verificações

- `npm test`: confirmação digitada, cancelamento e falhas de exclusão, além dos testes existentes.
- `npm run test:db`: aplica todas as migrações e testa lixo/restauração, exclusão definitiva de propostas aprovadas e contratos assinados, vínculos bloqueados, remoção de versões avulsas, preservação das etapas de obra, não recriação de cabeçalho e restrição por perfil.
- `npx tsc --noEmit` e `npm run build`.

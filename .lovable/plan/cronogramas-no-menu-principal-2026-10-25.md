# Cronogramas no menu principal

## Área própria
- Adicionar **Cronogramas** ao menu, acessível também no celular, sem remover os módulos atuais.
- Listar planejamentos vinculados e avulsos com cliente, projeto, início, término, avanço e situação.
- Adicionar busca e filtros por cliente, obra, situação, período e tipo, incluindo ativos, concluídos, atrasados, em elaboração e modelos.

## Novo cronograma
- **A partir de obra/orçamento:** selecionar um registro existente e reutilizar cliente, informações, etapas e serviços. Quando a obra já tem cronograma, abrir esse mesmo planejamento.
- **Avulso:** cadastrar cliente, projeto, local, descrição, datas, responsável e observações, sem criar obra, orçamento, contrato ou financeiro fictícios.
- Permitir criar, excluir, duplicar e ordenar etapas, alterar datas, definir duração e dependências opcionais, manter etapas simultâneas e atualizar o Gantt automaticamente.

## Reutilização e vínculo posterior
- Duplicar um cronograma para um novo projeto e marcar planejamentos como modelos reutilizáveis, sem confundir modelos com obras ativas.
- Adicionar **Vincular a uma obra**, preservando etapas, original e reprogramações.
- Se a obra escolhida já tiver planejamento, apresentar a situação antes de conectar; nunca substituir ou mesclar silenciosamente.

## Integração e documento
- Dentro da obra e no módulo, abrir o mesmo cronograma: datas e avanço atualizados por uma entrada aparecem na outra.
- Manter o original preservado e o histórico de alterações já implementado.
- Disponibilizar PDF profissional para os dois tipos, com identidade JMG, cliente, projeto, local, datas, duração, etapas, Gantt, observações e emissão; sem custos internos.

## Validação
- Validar criação avulsa sem gerar obra/orçamento, etapas simultâneas, duplicação, exclusão, modelos e PDF.
- Validar criação a partir do escopo existente, vínculo posterior e edição nas duas entradas, preservando histórico.
- Conferir filtros, menu no celular e regras de acesso, sem alterar cálculos financeiros.

## Detalhes técnicos
- Criar identificação canônica de cronograma com vínculo opcional à obra/orçamento, mantendo uma única fonte editável para etapas e versões.
- Evolução aditiva preserva identificadores e referências operacionais existentes; nenhuma obra fictícia será usada para representar cronogramas avulsos.
- Importação, duplicação e vínculo serão operações atômicas com permissões verificadas. Exclusão de etapas preservará histórico e respeitará referências já usadas pela execução.
- Reutilizar Gantt, helpers de datas/avanço e impressão existentes em vez de criar um segundo mecanismo de planejamento.
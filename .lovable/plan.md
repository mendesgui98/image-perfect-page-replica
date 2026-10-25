# Cronograma integrado da JMG

## Planejamento e execução
- Reutilizar as etapas existentes da obra e importar os serviços do orçamento aprovado, somente quando presentes no escopo. Obras diretas continuam com cadastro manual.
- Adicionar a opção **Criar Cronograma da Obra**, duração em dias e alteração da ordem das etapas.
- Manter datas previstas e reais separadas e permitir etapas simultâneas.
- Usar o mesmo avanço físico já exibido na obra e no Painel.

## Original e reprogramações
- Salvar o planejamento original com confirmação explícita, sem considerar datas antigas como um original já aprovado.
- Preservar o original e registrar versões das mudanças posteriores com data, autoria e motivo.
- Permitir comparar cronograma original, atual e execução real.

## Linha do tempo e documento
- Adicionar Gantt com cores por situação, identificação de atrasos e acesso às etapas.
- Mostrar etapas atuais/próximas, previsão de conclusão, dias restantes e situação na visão individual e na lista de obras.
- Adicionar **Gerar Cronograma** com página de impressão/PDF para cliente: logo, obra, cliente, endereço, datas, duração, etapas, linha do tempo, observações e emissão; sem informações de custos.

## Validação
- Testar duração, simultaneidade, atraso, importação restrita ao escopo e preservação do original.
- Validar com obra piloto: planejamento, original, alteração com motivo, comparação após reabertura, avanço compartilhado e documento com linha do tempo.
- Conferir computador e celular, preservando as funções financeiras existentes.

## Detalhes técnicos
- `work_stages` permanece a fonte única operacional. Histórico de planejamento guarda apenas snapshots imutáveis; não cria outra lista editável de etapas.
- Importação e versionamento serão operações atômicas com acesso validado no banco, reutilizando a auditoria existente.
- Datas e situação do cronograma usam helpers puros testados; PDF segue o padrão de impressão já usado pela plataforma.
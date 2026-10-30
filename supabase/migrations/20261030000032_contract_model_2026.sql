-- Novo modelo de contrato da JMG (Contrato-JMG-modelo, escolhido pelo Guilherme): substitui as
-- cláusulas do contrato antigo (CONTRATO.ELIANA). Só afeta contratos gerados daqui em diante;
-- contratos salvos e assinados continuam sendo snapshots imutáveis.
-- Os dados do orçamento aprovado entram pelos marcadores de src/lib/contract-clauses.ts:
-- {{OBJETO}}, {{ENDERECO_OBRA}}, {{AREA}}, {{ORCAMENTO}}, {{DATA_ORCAMENTO}}, {{VALOR}},
-- {{MAO_DE_OBRA}}, {{MATERIAIS}}, {{INICIO}}, {{PRAZO}} e, em linha sozinha, {{TABELA_PARCELAS}}
-- e {{DADOS_BANCARIOS}}. Linhas "- " viram itens; "I – " viram incisos; **texto** sai em negrito.

DELETE FROM public.contract_clauses;

INSERT INTO public.contract_clauses(sort, title, body) VALUES
(1, 'Objeto', $t${{N}}.1. Execução, pela CONTRATADA, de obra civil de {{OBJETO}}, no imóvel localizado em {{ENDERECO_OBRA}}{{AREA}}.
{{N}}.2. Os serviços, especificações, quantidades e materiais fornecidos pela CONTRATADA estão descritos no {{ORCAMENTO}}, emitido em {{DATA_ORCAMENTO}} (Anexo 1), que faz parte integrante deste contrato. Em caso de divergência, prevalece o disposto neste contrato.
{{N}}.3. A CONTRATADA fornecerá a mão de obra qualificada e os materiais relacionados no Anexo 1, executando os serviços conforme o projeto executivo fornecido pelo CONTRATANTE, as normas técnicas aplicáveis e as boas práticas da construção civil.$t$),
(2, 'Valor', $t${{N}}.1. O valor total deste contrato é de {{VALOR}}, sendo {{MAO_DE_OBRA}} referentes à mão de obra e {{MATERIAIS}} referentes aos materiais relacionados no Anexo 1.
{{N}}.2. O valor é fixo e irreajustável para o escopo descrito no Anexo 1. Qualquer alteração de escopo será tratada conforme a cláusula de Serviços extras.$t$),
(3, 'Condições de pagamento', $t${{N}}.1. Os pagamentos serão efetuados conforme o cronograma financeiro abaixo:
{{TABELA_PARCELAS}}
{{N}}.2. A entrada deverá ser paga com antecedência mínima de 7 (sete) dias corridos da data prevista para o início da obra, destinando-se à compra de materiais de proteção, insumos e à mobilização da equipe.
{{N}}.3. As demais parcelas serão liberadas mediante medição da etapa correspondente. O CONTRATANTE terá até 3 (três) dias úteis para aprovar a medição; não havendo manifestação nesse prazo, a medição será considerada aprovada.
{{N}}.4. Os pagamentos serão feitos por PIX ou transferência bancária (TED) para a conta da CONTRATADA abaixo, e serão confirmados mediante envio do comprovante:
{{DADOS_BANCARIOS}}
{{N}}.5. Em caso de atraso no pagamento, incidirão multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês sobre o valor em atraso. Após notificação, a CONTRATADA poderá suspender os serviços até a regularização, com prorrogação automática do prazo.$t$),
(4, 'Materiais e itens não inclusos', $t${{N}}.1. Os materiais de acabamento (porcelanatos, revestimentos, rodapés, louças, metais, bancadas de pedra, luminárias decorativas e similares) são adquiridos pelo CONTRATANTE. A CONTRATADA realizará a instalação dos itens previstos no Anexo 1.
{{N}}.2. O CONTRATANTE deverá entregar na obra os materiais sob sua responsabilidade nas datas combinadas no cronograma. Atrasos na entrega prorrogam o prazo de execução.
{{N}}.3. Este contrato não inclui o fornecimento nem a instalação de equipamentos eletroeletrônicos e eletrodomésticos, que ficam a cargo do CONTRATANTE e dos fornecedores por ele escolhidos.$t$),
(5, 'Prazo de execução', $t${{N}}.1. A obra terá início quando atendidos todos os requisitos abaixo:
- assinatura deste contrato;
- comprovação do pagamento da entrada;
- emissão de ART/RRT, quando aplicável;
- autorização da obra pelo condomínio, quando houver.
{{N}}.2. A data prevista para o início é {{INICIO}}, com prazo estimado de {{PRAZO}}, conforme o cronograma do Anexo 1. O cronograma definitivo será confirmado no Termo de Início de Obra (Anexo 2).
{{N}}.3. Fica pactuada uma tolerância de até 20% (vinte por cento) sobre o prazo total, sem que isso configure atraso da CONTRATADA.
{{N}}.4. O prazo será prorrogado automaticamente, sem necessidade de aditivo, pelo período correspondente, nas seguintes hipóteses:
I – atraso de pagamento pelo CONTRATANTE;
II – atraso na entrega de materiais sob responsabilidade do CONTRATANTE;
III – indefinição do CONTRATANTE quanto a acabamentos, cores, paginações ou detalhes necessários à continuidade da obra;
IV – alterações de projeto ou de escopo, ou incompatibilidade entre projetos fornecidos pelo CONTRATANTE;
V – impedimento de acesso ao local, inclusive pela administração do condomínio;
VI – interferência ou paralisação causada por terceiros contratados diretamente pelo CONTRATANTE;
VII – serviços extras solicitados pelo CONTRATANTE;
VIII – chuvas, condições climáticas adversas, caso fortuito ou força maior.
{{N}}.5. Havendo suspensão da obra por motivo atribuível ao CONTRATANTE, o prazo ficará congelado até a regularização da pendência.
{{N}}.6. Em caso de atraso exclusivamente imputável à CONTRATADA, será aplicada multa de 0,3% (zero vírgula três por cento) ao dia sobre o valor da etapa em atraso, limitada a 10% (dez por cento) do valor total do contrato.$t$),
(6, 'Obrigações da contratada', $t${{N}}.1. Executar os serviços com a qualidade exigida no projeto, empregando mão de obra qualificada e treinada, evitando desperdício dos materiais e mantendo o local organizado.
{{N}}.2. Cumprir as normas de segurança e medicina do trabalho (Normas Regulamentadoras — NRs), fornecer os equipamentos de proteção exigidos e manter regular o seguro de acidentes de trabalho de seus funcionários.
{{N}}.3. Este contrato não gera vínculo empregatício entre o CONTRATANTE e os funcionários da CONTRATADA, que responde integralmente pelas obrigações trabalhistas, previdenciárias e fiscais de sua equipe.
{{N}}.4. Responder pelos danos diretos comprovadamente causados por sua ação ou omissão durante a execução dos serviços, limitada essa responsabilidade ao valor total do contrato. Não são de responsabilidade da CONTRATADA vícios ocultos ou problemas preexistentes da edificação, danos causados por terceiros e falhas decorrentes de projetos fornecidos pelo CONTRATANTE.$t$),
(7, 'Obrigações do contratante', $t${{N}}.1. Fornecer os projetos executivos elaborados por arquitetos ou engenheiros, quando necessários à execução dos serviços.
{{N}}.2. Adquirir e entregar no prazo os materiais de acabamento e demais itens sob sua responsabilidade.
{{N}}.3. Garantir acesso ao local, fornecimento de água e energia elétrica e condições adequadas de trabalho, além de obter a autorização da obra junto ao condomínio.
{{N}}.4. Efetuar os pagamentos nas datas e condições previstas e definir, em tempo hábil, os acabamentos e detalhes necessários à continuidade da obra.$t$),
(8, 'Serviços extras', $t${{N}}.1. Qualquer serviço não previsto no Anexo 1, inclusive alterações de projeto, será considerado extra.
{{N}}.2. A execução de serviços extras dependerá de aprovação prévia por escrito, com definição de valor e prazo, por meio de aditivo ou ordem de serviço extra assinada pelas partes.
{{N}}.3. Os serviços extras implicam revisão automática do prazo de execução.$t$),
(9, 'Entrega e aceite da obra', $t${{N}}.1. A obra será considerada concluída com a execução dos serviços contratados, a limpeza do local, o funcionamento das instalações executadas e a assinatura do Termo de Conclusão de Obra por ambas as partes.
{{N}}.2. Após a comunicação formal de conclusão, o CONTRATANTE terá 2 (dois) dias úteis para realizar a vistoria. Não havendo manifestação nesse prazo, a etapa ou a obra será considerada aceita.
{{N}}.3. Eventuais pendências deverão ser registradas por escrito em lista de ajustes e serão corrigidas pela CONTRATADA em prazo compatível com sua complexidade. Pequenas imperfeições estéticas que não comprometam o funcionamento ou a segurança não impedem o aceite.
{{N}}.4. A assinatura do Termo de Conclusão de Obra é condição para a liberação da última parcela.$t$),
(10, 'Garantia', $t${{N}}.1. Os serviços executados terão garantia de 12 (doze) meses, contados da data de entrega da obra, sem prejuízo das garantias previstas em lei.
{{N}}.2. Durante a garantia, a CONTRATADA iniciará o atendimento em até 5 (cinco) dias úteis após notificação formal. O prazo do reparo será definido conforme a natureza e a complexidade do serviço.
{{N}}.3. A garantia não cobre:
- mau uso ou uso indevido dos materiais e instalações;
- desgaste natural;
- intervenções de terceiros;
- problemas preexistentes ou vícios ocultos da edificação;
- defeitos de fabricação dos materiais fornecidos pelo CONTRATANTE.
{{N}}.4. A contratação de terceiros pelo CONTRATANTE para corrigir serviços em garantia, sem prévia notificação e prazo de solução à CONTRATADA, implicará a perda da garantia sobre os serviços alterados.$t$),
(11, 'Rescisão', $t${{N}}.1. Este contrato poderá ser rescindido nos seguintes casos:
- acordo entre as partes, por escrito;
- falta de pagamento de qualquer parcela;
- paralisação injustificada da obra pela CONTRATADA;
- descumprimento de qualquer cláusula deste contrato.
{{N}}.2. Antes da rescisão por descumprimento, a parte prejudicada deverá notificar a outra por escrito, concedendo prazo mínimo de 5 (cinco) dias úteis para a regularização. Não se considera paralisação injustificada aquela decorrente de inadimplência do CONTRATANTE ou de fatores alheios à CONTRATADA.
{{N}}.3. Em caso de rescisão, será feita a medição dos serviços executados até a data, para pagamento ou devolução dos valores correspondentes.
{{N}}.4. A parte que der causa à rescisão pagará à outra multa de 10% (dez por cento) sobre o valor dos serviços ainda não executados.$t$),
(12, 'Condições gerais', $t${{N}}.1. A CONTRATADA não é responsável pelos serviços executados por terceiros contratados diretamente pelo CONTRATANTE, nem pela compatibilização desses serviços com os deste contrato.
{{N}}.2. As comunicações entre as partes serão feitas por escrito, sendo válidas as realizadas por e-mail ou aplicativo de mensagens.
{{N}}.3. A tolerância de uma das partes quanto ao descumprimento de qualquer cláusula não significará renúncia ou alteração do que foi pactuado.
{{N}}.4. As partes autorizam o uso de seus dados pessoais exclusivamente para a execução deste contrato, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
{{N}}.5. Este contrato poderá ser assinado eletronicamente, nos termos da legislação vigente.$t$),
(13, 'Foro', $t${{N}}.1. As partes elegem o foro da comarca de **São Paulo – SP** para dirimir quaisquer questões oriundas deste contrato.$t$);

-- Modelo de cláusulas do contrato (Configurações → Contrato). O PDF do contrato gerado a partir
-- do orçamento aprovado lê as cláusulas ativas, na ordem. Editar o modelo só afeta contratos
-- gerados depois; contratos salvos e assinados continuam sendo snapshots imutáveis.
-- Marcadores no texto: {{N}} número da cláusula; {{ORCAMENTO}}, {{ENDERECO_OBRA}}, {{VALOR}},
-- {{INICIO}}, {{PRAZO}}; numa linha sozinha: {{TABELA_ETAPAS}}, {{TABELA_PARCELAS}},
-- {{DADOS_BANCARIOS}}. Cada linha vira um parágrafo; "{{N}}.x.y." e incisos romanos ficam recuados.
-- Texto base: contrato antigo da JMG (CONTRATO.ELIANA), escolhido pelo Guilherme.

CREATE TABLE public.contract_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort integer NOT NULL DEFAULT 0,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  body text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contract_clauses_sort_idx ON public.contract_clauses(sort);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_clauses TO authenticated;
GRANT ALL ON public.contract_clauses TO service_role;
ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_clauses_read ON public.contract_clauses FOR SELECT TO authenticated
  USING (public.can_see_costs(auth.uid()));
CREATE POLICY contract_clauses_write ON public.contract_clauses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER contract_clauses_audit BEFORE INSERT OR UPDATE ON public.contract_clauses
  FOR EACH ROW EXECUTE FUNCTION public.touch_audit();

INSERT INTO public.contract_clauses(sort, title, body) VALUES
(1, 'Objetivo', $t${{N}}.1. Execução de obra civil de reforma residencial, situada no endereço {{ENDERECO_OBRA}};
{{N}}.2. Todos os serviços objeto desse contrato, assim como suas especificações, quantidades e materiais inclusos, estão especificados e representados no {{ORCAMENTO}}, e de acordo com o projeto executivo;
{{N}}.3. Fornecimento de mão de obra qualificada para execução dos serviços, quantificados e descritos no {{ORCAMENTO}}, organizados nas etapas abaixo:
{{TABELA_ETAPAS}}$t$),
(2, 'Valor', $t${{N}}.1. O valor a pagar pelo CONTRATANTE para a execução dos serviços listados no item 1 (OBJETIVO) deste contrato é de {{VALOR}};$t$),
(3, 'Pagamento', $t${{N}}.1. Os pagamentos deverão ser efetuados conforme o fluxo financeiro a seguir:
{{TABELA_PARCELAS}}
{{N}}.2. A confirmação dos pagamentos se dará após recebimento de comprovante de transferência.
{{N}}.3. Todos e quaisquer serviços extraordinários, que não constem do presente contrato, deverão ser objeto de propostas adicionais, e após acordado o preço e prazo. As modificações na planta original serão executadas somente após concordância das partes (contratante e contratado), tanto com relação a aumento do prazo inicialmente determinado quanto com relação a preços de montagem. Ficando por conta e responsabilidade do contratante o fornecimento dos materiais necessários.
{{N}}.4. Os pagamentos serão realizados através de PIX, transferência bancária ou boleto, para a conta corrente em nome da contratada:
{{DADOS_BANCARIOS}}$t$),
(4, 'Não inclusos', $t${{N}}.1. O presente contrato não obriga o CONTRATADO a fornecer quaisquer materiais de acabamento previstos no projeto que não estejam relacionados no {{ORCAMENTO}}, sendo que a compra desses materiais de acabamento é de responsabilidade do CONTRATANTE;
{{N}}.2. O CONTRATADO é responsável pela instalação desses materiais de acabamento, desde que especificados no {{ORCAMENTO}};
{{N}}.3. O presente contrato não obriga o CONTRATADO a fornecer e instalar qualquer tipo de equipamento eletroeletrônico, sendo que a compra e a instalação desses é de responsabilidade do CONTRATANTE e o fornecedor escolhido.$t$),
(5, 'Prazo de execução', $t${{N}}.1. A obra terá início quando todos os requisitos estiverem atendidos:
{{N}}.1.1. Assinatura desse Contrato;
{{N}}.1.2. Comprovação do pagamento do Sinal;
{{N}}.1.3. Emissão de RRT (Registro de Responsabilidade Técnica).
{{N}}.2. A data estipulada para início e para que todos os requisitos acima estejam em acordo é {{INICIO}};
{{N}}.2.1. A data de início pode sofrer alteração por conta de caso fortuito e força maior, na forma da lei civil; ou não cumprimento de todos os requisitos acima;
{{N}}.3. A obra será executada conforme o Cronograma Físico-Financeiro, cujo prazo estimado é de {{PRAZO}} para conclusão dos serviços. Ficando desde já pactuada uma tolerância suplementar de até 20% (vinte por cento) sobre o prazo total, sem que isso configure atraso ou inadimplemento por parte do CONTRATADO.
{{N}}.3.1. O prazo contratual será automaticamente prorrogado, sem necessidade de aditivo, nas seguintes hipóteses:
I – atraso na entrega de materiais sob responsabilidade do CONTRATANTE;
II – indecisão do CONTRATANTE quanto a acabamentos, cores, paginações, detalhes ou qualquer definição necessária para continuidade da obra;
III – incompatibilização entre projetos (arquitetura, marcenaria, elétrica, hidráulica, climatização ou automação);
IV – impedimento de acesso ao local pela administração do condomínio;
V – chuvas, condições climáticas adversas, caso fortuito ou força maior;
VI – paralisações determinadas por terceiros contratados diretamente pelo CONTRATANTE;
VII – serviços extras solicitados pelo CONTRATANTE e formalizados via Ordem de Serviço Extra.
{{N}}.3.2. O atraso injustificado no cumprimento das obrigações contratuais sujeitará o contratado à multa de 1% (um por cento) ao dia, incidente sobre o valor total do contrato, limitada a 20% (vinte por cento), sem prejuízo das demais penalidades previstas.
{{N}}.3.3. Em qualquer hipótese de suspensão ou impossibilidade de continuidade da obra por motivos atribuíveis ao CONTRATANTE, o prazo ficará congelado até a completa regularização da pendência, acrescido de prazo suplementar proporcional.
{{N}}.3.4. O prazo final de entrega será revalidado no Termo de Início de Obra (ANEXO 2), podendo ser ajustado de acordo com o cronograma definitivo.$t$),
(6, 'Obrigação do contratado', $t${{N}}.1. O CONTRATADO deverá executar todos os serviços com o cumprimento da qualidade requerida no projeto, demonstrando conhecimento técnico e capacidade de leitura e interpretação dos projetos, aplicar mão de obra devidamente qualificada e treinada, visando obter alta qualidade geral da obra, maior durabilidade, baixa manutenção das instalações, economia de recursos e evitando desperdícios dos materiais fornecidos;
{{N}}.2. O CONTRATADO se obriga a manter vigente e regular o seguro de acidentes de trabalho para seus funcionários. Obriga-se ainda a respeitar e cumprir todas as normas de segurança de trabalho e medicina do trabalho (vide portaria nº 3214 de 08/06/78 do Ministério do Trabalho), tomando todas as medidas necessárias de proteção aos empregados e terceiros durante as obras em construção, inclusive fornecer todos os materiais de proteção exigidos pela legislação vigente;
{{N}}.3. Fica expressamente acordado que não se estabelece por força deste contrato qualquer relação de emprego entre o CONTRATANTE e o CONTRATADO, sendo única e exclusiva responsabilidade do CONTRATADO toda e qualquer reclamação que porventura advier de seus funcionários;$t$),
(7, 'Obrigação do contratante', $t${{N}}.1. O CONTRATANTE deverá fornecer todos os projetos executivos desenvolvidos por arquitetos ou engenheiros;
{{N}}.2. O CONTRATANTE deverá fornecer os materiais de acabamento não relacionados no {{ORCAMENTO}}, com insumos inerentes às tarefas a serem desenvolvidas pelo CONTRATADO;$t$),
(8, 'Garantia', $t${{N}}.1. Todos os serviços contratados terão garantia de 12 meses, contados a partir da entrega da obra;
{{N}}.2. A CONTRATADA não será responsabilizada diretamente por defeitos causados pela má utilização ou utilização indevida de nenhum dos materiais e insumos empregados na obra;$t$),
(9, 'Rescisão contratual', $t${{N}}.1. Serão motivos de rescisão contratual:
{{N}}.1.1. A solicitação por requerimento das partes, com justificativa formal e por escrito;
{{N}}.1.2. O não pagamento de quaisquer das parcelas convencionadas;
{{N}}.1.3. A não execução dos serviços dentro dos prazos estipulados;
{{N}}.1.4. O não cumprimento de quaisquer das cláusulas e condições estabelecidas no presente instrumento.
{{N}}.2. Na ocorrência de quaisquer das situações contempladas descritas acima, considerar-se-á rescindido o presente contrato independente de qualquer notificação ou interpelação judicial ou extrajudicial.
{{N}}.3. Ocorrendo a rescisão contratual pelos motivos contemplados acima, será efetuada medição dos serviços realizados, e avaliados para pagamento ou devolução à parte prejudicada (contratante ou contratado).
{{N}}.4. Fica estipulada ao CONTRATADO uma multa de 10% sobre o saldo restante a receber caso haja infração de qualquer uma das regras ou rescisão desse contrato sem prévio consentimento da outra parte;
{{N}}.5. Fica estipulada ao CONTRATANTE uma multa de 10% sobre o valor já pago caso haja infração de qualquer uma das regras ou rescisão desse contrato sem prévio consentimento da outra parte;$t$),
(10, 'Condições gerais', $t${{N}}.1. A CONTRATADA será totalmente responsável pela execução da obra civil;
{{N}}.2. A CONTRATADA não é responsável pelos serviços executados por terceiros contratados diretamente pelo CONTRATANTE, nem da compatibilização dos serviços prestados por tais terceiros com os serviços firmados por este contrato e que não estejam previstos no projeto;
{{N}}.3. Durante o período vigente deste contrato, em caso de desastre natural, pandemia, mudança repentina do tempo climático ou prolongação do mesmo (chuvas), que dificulte ou impeça o acesso do local ou andamento do serviço proposto, fica o tempo estimado para o término da obra suspenso, até que haja condições seguras para realização do serviço;
{{N}}.4. Todas as situações descritas acima, entre outras que se encaixarem, deverão ser expressamente acordadas entre CONTRATADO e CONTRATANTE, a fim de extinguir qualquer tipo de dúvida de ambas as partes;
{{N}}.5. Ao término, será assinado o Termo de Conclusão de Obra, condição obrigatória para liberação da última parcela.$t$);

NOTIFY pgrst, 'reload schema';

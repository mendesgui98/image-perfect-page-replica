# Roteiro de melhorias da plataforma JMG

Lista priorizada do que falta refinar, para executar uma tarefa por vez. Para pedir: "faz a R2-1".
Cada tarefa entra num PR próprio; ao terminar, marcar `[x]`, registrar em
`contexto-desenvolvimento.md` e, se mudar regra, em `AGENTS.md`.

Legenda: **Depende do Guilherme** = precisa de uma informação, conta ou decisão antes de começar.

---

## Fase 1 — Segurança e confiabilidade (esta semana)

### [ ] R1-1 · E-mail de envio (SMTP)

- **Por quê:** o deploy avisa `SMTP_HOST vazio`; convites, recuperação de senha e qualquer envio de recibo/contrato por e-mail não funcionam.
- **O que fazer:** cadastrar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL` nos segredos/variáveis do GitHub (o workflow já monta o `infra/.env` com eles); testar convite e "esqueci a senha".
- **Onde:** `.github/workflows/ci.yml`, `docs/deploy-vps.md`.
- **Pronto quando:** um convite chega na caixa de entrada e a recuperação de senha funciona em produção.
- **Depende do Guilherme:** conta de e-mail de envio (ex.: Google Workspace, Zoho, Brevo, Resend) e a senha de app.

### [ ] R1-2 · Dados da empresa e verificação em duas etapas

- **O que fazer:** preencher o e-mail da JMG em Configurações → Empresa e ativar a verificação em duas etapas da conta de administrador (Configurações → Segurança).
- **Pronto quando:** os dois avisos amarelos somem do Painel.
- **Depende do Guilherme:** é feito por ele na tela (2 minutos).

### [x] R1-3 · Aviso quando o deploy falhar

- **Por quê:** em 30/10 um deploy falhou na etapa "Montar infra/.env de produção" e ninguém viu; o recibo só subiu no deploy seguinte.
- **O que fazer:** investigar a causa da falha intermitente; tornar o passo resiliente (nova tentativa) e notificar por e-mail (ou WhatsApp/Telegram) quando o deploy falhar.
- **Onde:** `.github/workflows/ci.yml`, `infra/vps/deploy.sh`.
- **Pronto quando:** uma falha simulada gera aviso e a etapa tenta de novo antes de desistir.
- **Depende do Guilherme:** para onde mandar o aviso (e-mail já resolve, depois da R1-1).
- **Feito (30/10):** a causa era o `ssh-keyscan` (desiste em 5 s) quando a VPS demorava a responder; agora tenta 6 vezes com folga e o SSH tem timeout/keepalive. Deploy com falha abre a issue "Deploy em produção falhou" (o GitHub avisa por e-mail) e o próximo deploy bom fecha a issue.

### [ ] R1-4 · Backup diário do banco fora da VPS

- **O que fazer:** rotina agendada (GitHub Actions ou cron na VPS) com `pg_dump` diário, criptografado, guardado fora da VPS, com retenção de 30 dias; documentar como restaurar e testar uma restauração.
- **Onde:** `.github/workflows/`, `infra/vps/`, `docs/deploy-vps.md`.
- **Pronto quando:** existem backups dos últimos dias no destino e uma restauração de teste funcionou.
- **Depende do Guilherme:** destino do backup (ex.: Google Drive, Backblaze B2, S3 ou outra VPS).

---

## Fase 2 — Indicadores e precificação (próximas 2 semanas)

### [ ] R2-1 · Caixa projetado em 90 dias (entradas e saídas)

- **Por quê:** o fluxo de caixa do Painel projeta só o que vai entrar; com as saídas previstas dá para ver antes um mês negativo.
- **O que fazer:** projeção semanal/mensal de saldo = saldo atual + a receber − a pagar (contas, parcelas de compra, impostos previstos); alerta no "Atenção" quando o saldo projetado ficar negativo.
- **Onde:** `src/lib/dashboard-home.ts` (puro, testado), `src/components/management/home-panel.tsx`.
- **Pronto quando:** o gráfico mostra a linha de saldo projetado e o alerta aparece com dados de teste.

### [ ] R2-2 · Funil comercial

- **O que fazer:** indicadores de orçamentos por situação (elaboração, enviados, aprovados, recusados), taxa de conversão, tempo médio até aprovação, valor em propostas abertas e motivo da recusa (campo novo ao recusar).
- **Onde:** migração para o motivo da recusa, `src/lib/` (puro), Painel e lista de Orçamentos.
- **Pronto quando:** o Painel mostra o funil do período filtrado e a recusa pede o motivo.

### [ ] R2-3 · Inadimplência

- **O que fazer:** % vencido sobre o que deveria ter sido recebido, dias médios de atraso por cliente e por obra; destaque no Painel e no cadastro do cliente.
- **Onde:** `src/lib/operations.ts`/`executive.ts`, Painel, perfil da pessoa.
- **Pronto quando:** os números batem com as contas a receber vencidas.

### [ ] R2-4 · Reserva técnica (contingência) no orçamento

- **Por quê:** imprevistos de reforma (demolição, hidráulica antiga) hoje saem da margem sem aparecer.
- **O que fazer:** novo percentual "Reserva técnica" em `pricing_settings` e nos parâmetros do orçamento, entrando na formação do preço (`priceFromCost`/`costBreakdown`) e no painel de preços; nunca no PDF do cliente.
- **Onde:** migração, `src/lib/pricing.ts` + testes, `pricing-panel.tsx`, Configurações.
- **Pronto quando:** o preço calculado inclui a reserva, orçamentos fechados não mudam e os testes de pricing passam.
- **Depende do Guilherme:** percentual padrão (sugestão: 3% a 5%).

### [ ] R2-5 · Margem mínima por tipo de obra

- **O que fazer:** margem mínima e desejada por tipo de obra (banheiro, cozinha, apartamento completo, casa, comercial), aplicada como padrão ao criar o orçamento.
- **Onde:** migração (`pricing_settings` por tipo), Configurações, criação de orçamento.
- **Depende do Guilherme:** tabela de margens por tipo.

### [ ] R2-6 · Preço de material desatualizado

- **O que fazer:** mostrar no catálogo a data da última atualização de preço e avisar no orçamento quando um material passar de 60 dias (configurável).
- **Onde:** `materiais.tsx`, `items-editor.tsx`, `pricing_settings`.
- **Pronto quando:** material antigo aparece com aviso no item do orçamento.

### [ ] R2-7 · Custo e preço por m²

- **O que fazer:** no orçamento, preço e custo por m² da área informada e a média das obras do mesmo tipo.
- **Onde:** `src/lib/pricing.ts` (helper puro), painel de preços.

---

## Fase 3 — Aprender com as obras e automatizar cobrança

### [ ] R3-1 · Orçado × realizado nas obras encerradas

- **O que fazer:** ao finalizar a obra, relatório de margem orçada × realizada por etapa e por serviço; média por tipo de obra, sugerindo ajuste de estrutura e margem.
- **Onde:** `src/lib/work-composition.ts`/`pricing.ts` (sem duplicar fórmulas), aba da obra, Análises do Financeiro.

### [ ] R3-2 · Mão de obra cadastrada × paga

- **O que fazer:** comparar o custo de MO do catálogo com o pago às equipes por serviço (saídas com etapa/serviço), sugerindo atualizar o catálogo.

### [ ] R3-3 · Medição ligada às etapas

- **O que fazer:** cada parcela do orçamento pode apontar as etapas que a liberam ("ao concluir as etapas 1 a 4"); quando elas chegam a 100%, a parcela fica "pronta para cobrar" com alerta no Painel e atalho para gerar a cobrança.
- **Onde:** `payment_terms` (vínculo com etapas), `work_stages`, Painel ("Atenção").

### [ ] R3-4 · Resultado consolidado da empresa

- **O que fazer:** soma das margens das obras − custos fixos reais da JMG (estrutura), para conferir se os 12,5% de estrutura cobrem o custo fixo.
- **Onde:** Análises do Financeiro (categoria de despesa fixa).

---

## Fase 4 — Cliente e envio de documentos

### [ ] R4-1 · Enviar recibo, orçamento e contrato por e-mail/WhatsApp

- **Depende de:** R1-1 (e-mail). WhatsApp: link "wa.me" com mensagem e link do PDF, ou API oficial.

### [ ] R4-2 · Assinatura eletrônica do contrato

- **O que fazer:** integrar com Clicksign, D4Sign ou ZapSign; o contrato assinado volta sozinho como "Contrato assinado" com o documento guardado.
- **Depende do Guilherme:** escolher o serviço e criar a conta (API).

### [ ] R4-3 · Aditivo aprovado pelo cliente

- **O que fazer:** link para o cliente aprovar o aditivo; ao aprovar, gera a conta a receber.

### [ ] R4-4 · Portal do cliente

- **O que fazer:** link só de leitura por obra com cronograma, fotos do diário, pagamentos e recibos.

### [ ] R4-5 · Compras com cotação

- **O que fazer:** comparar 2–3 cotações por pedido; aviso de material do cliente perto do prazo.

---

## Fase 5 — Qualidade contínua

### [ ] R5-1 · Testes de ponta a ponta no CI

- **O que fazer:** Playwright cobrindo orçamento → aprovação → obra → contrato → recebimento → recibo, rodando no CI com o stack local.

### [ ] R5-2 · Resumo diário por e-mail

- **O que fazer:** e-mail diário com os itens do "Atenção", contratos aguardando assinatura e vencimentos do dia.
- **Depende de:** R1-1.

### [ ] R5-3 · Curva S físico-financeira

- **O que fazer:** por obra, avanço físico × financeiro × custo ao longo do tempo, usando o histórico de `work_history` e as baixas.

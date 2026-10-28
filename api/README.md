# API JMG Obras

Serviço próprio para o que o banco não faz sozinho: administração de usuários, convites,
exportação de dados e, nas próximas etapas, e-mails, PDFs no servidor, rotinas agendadas
e integrações (banco, NF-e, WhatsApp).

- Node 22 executando TypeScript direto (`--experimental-strip-types`), sem framework e sem build.
- Dependências: `postgres` (driver), `zod` (validação) e, para os PDFs, `playwright-core` (Chromium),
  `pdf-lib` (cabeçalho, rodapé e paginação) e `@fontsource/inter` (fonte embutida, sem internet).
- Autenticação: o mesmo JWT do Supabase Auth, verificado com `JWT_SECRET` (HS256).
- Autorização: papéis em `public.user_roles`. Rotas `/v1/admin/*` exigem `admin` e, se o
  administrador tiver 2FA cadastrado, sessão `aal2`.
- `db.asUser()` executa consultas como o usuário da requisição (papel `authenticated` + claims),
  reaproveitando as políticas RLS do banco em vez de duplicar regras.

## Rotas

| Método | Caminho                       | Acesso           | Função                                                  |
| ------ | ----------------------------- | ---------------- | ------------------------------------------------------- |
| GET    | `/health`                     | público          | Estado da API e do banco                                |
| GET    | `/v1/me`                      | usuário          | Id, e-mail, papéis e nível de autenticação              |
| GET    | `/v1/admin/users`             | admin            | Usuários com papéis, 2FA e último acesso                |
| POST   | `/v1/admin/invites`           | admin            | Convida por e-mail e já define o papel                  |
| PUT    | `/v1/admin/users/:id/roles`   | admin            | Altera papéis (não remove o último admin nem o próprio) |
| GET    | `/v1/admin/export`            | admin            | Exporta todas as tabelas em JSON (backup lógico)        |
| POST   | `/v1/orcamentos/:id/pdf`      | admin/financeiro | PDF oficial do orçamento (modelo JMG)                   |
| POST   | `/v1/orcamentos/:id/contrato` | admin/financeiro | Contrato no mesmo visual (só orçamento aprovado)        |

## PDFs

`src/pdf/` monta o HTML (`proposal-html.ts`, `contract-html.ts`, identidade comum em `layout.ts`),
gera o PDF no Chromium e carimba cabeçalho/rodapé com pdf-lib (`render.ts`). Os dados vêm de
`src/lib/proposal.ts` (módulo puro do app, sem custos internos). Pendências (parcelas fora de 100%,
cliente, endereço, contrato sem aprovação) devolvem 422 com a mensagem para a tela.

Localmente o Chromium vem de `npx playwright-core install chromium-headless-shell`. Para conferir o
visual sem banco: `node --experimental-strip-types api/src/pdf/sample.ts exemplo.pdf`.

Erros sempre em JSON: `{ "error": "codigo", "message": "texto para o usuário" }`.

## Rodar

```sh
cp api/.env.example api/.env   # preencha com os valores do infra/.env
bun run api:dev                # http://localhost:4000
bun run api:test               # testes (node:test)
```

Em produção a API fica atrás do Caddy em `https://api.seudominio/jmg/*`.

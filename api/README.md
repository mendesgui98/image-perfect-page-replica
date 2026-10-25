# API JMG Obras

Serviço próprio para o que o banco não faz sozinho: administração de usuários, convites,
exportação de dados e, nas próximas etapas, e-mails, PDFs no servidor, rotinas agendadas
e integrações (banco, NF-e, WhatsApp).

- Node 22 executando TypeScript direto (`--experimental-strip-types`), sem framework e sem build.
- Dependências: `postgres` (driver) e `zod` (validação).
- Autenticação: o mesmo JWT do Supabase Auth, verificado com `JWT_SECRET` (HS256).
- Autorização: papéis em `public.user_roles`. Rotas `/v1/admin/*` exigem `admin` e, se o
  administrador tiver 2FA cadastrado, sessão `aal2`.
- `db.asUser()` executa consultas como o usuário da requisição (papel `authenticated` + claims),
  reaproveitando as políticas RLS do banco em vez de duplicar regras.

## Rotas

| Método | Caminho                     | Acesso  | Função                                                  |
| ------ | --------------------------- | ------- | ------------------------------------------------------- |
| GET    | `/health`                   | público | Estado da API e do banco                                |
| GET    | `/v1/me`                    | usuário | Id, e-mail, papéis e nível de autenticação              |
| GET    | `/v1/admin/users`           | admin   | Usuários com papéis, 2FA e último acesso                |
| POST   | `/v1/admin/invites`         | admin   | Convida por e-mail e já define o papel                  |
| PUT    | `/v1/admin/users/:id/roles` | admin   | Altera papéis (não remove o último admin nem o próprio) |
| GET    | `/v1/admin/export`          | admin   | Exporta todas as tabelas em JSON (backup lógico)        |

Erros sempre em JSON: `{ "error": "codigo", "message": "texto para o usuário" }`.

## Rodar

```sh
cp api/.env.example api/.env   # preencha com os valores do infra/.env
bun run api:dev                # http://localhost:4000
bun run api:test               # testes (node:test)
```

Em produção a API fica atrás do Caddy em `https://api.seudominio/jmg/*`.

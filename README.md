# JMG Reformas — Gestão de obras

Sistema web (e PWA) de orçamentos, contratos, obras, cronogramas, compras e financeiro da JMG Reformas.

**Stack:** TypeScript, React 19, TanStack Start (SSR) + Router + Query, Tailwind 4, shadcn/Radix.
Backend: PostgreSQL com Supabase self-hosted (Auth, PostgREST, Storage), regras de negócio em funções
SQL e RLS. Tudo roda em Docker e é publicado em VPS.

## Começando

Pré-requisitos: Node 22+, [Bun](https://bun.sh) 1.x e Docker (Docker Desktop ou OrbStack, aberto).

```sh
bun install
bun run dev:all      # banco + Auth em Docker; front e API locais com recarga automática
```

Ou tudo em containers, igual à VPS:

```sh
bun run stack:up     # front, API, banco, Auth, Storage — tudo num comando
```

Na primeira vez o `infra/.env` é criado com segredos gerados automaticamente. Depois de criar
sua conta em http://localhost:3000/auth, torne-a administradora:

```sh
bun run stack:admin seu@email.com
```

| Endereço                     | O que é                                     |
| ---------------------------- | ------------------------------------------- |
| http://localhost:3000        | App                                         |
| http://localhost:4000/health | API própria                                 |
| http://localhost:8000        | Gateway (Auth, REST, Storage)               |
| http://localhost:3001        | Studio (banco)                              |
| http://localhost:8025        | Caixa de e-mails de teste (convites, senha) |

Para publicar na VPS, veja [infra/README.md](infra/README.md).

## Scripts

| Comando              | O que faz                                              |
| -------------------- | ------------------------------------------------------ |
| `bun run dev`        | Front em modo desenvolvimento (porta 3000)             |
| `bun run build`      | Build de produção (servidor Node em `.output/`)        |
| `bun run start`      | Executa o build de produção                            |
| `bun run test`       | Testes unitários (Vitest)                              |
| `bun run test:db`    | Regras do banco com PGlite (aplica todas as migrações) |
| `bun run typecheck`  | Checagem de tipos                                      |
| `bun run lint`       | ESLint + Prettier                                      |
| `bun run db:migrate` | Aplica migrações pendentes em `DATABASE_URL`           |

## Banco de dados

- Migrações em `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`; nunca edite uma migração já aplicada.
- O serviço `migrate` (ou `bun run db:migrate`) aplica as pendentes e registra em
  `supabase_migrations.schema_migrations`, compatível com a Supabase CLI.
- Tipos do banco: `src/integrations/supabase/types.ts`.

## Fluxo de trabalho

1. Crie uma branch a partir da `main` (`feat/...`, `fix/...`).
2. Abra um Pull Request; o CI roda tipos, lint, testes e build.
3. Faça merge só com o CI verde.

Regras de arquitetura e de negócio: [AGENTS.md](AGENTS.md). Documentos técnicos em `docs/`.

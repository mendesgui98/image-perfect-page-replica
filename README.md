# JMG Reformas — Gestão de obras

Aplicação de orçamentos, contratos, obras, cronogramas, compras e financeiro da JMG Reformas. Desenvolvida com React, TypeScript, TanStack Start/Query e Supabase; interface com Tailwind e Radix.

## Desenvolvimento

Use Node.js 24 ou uma versão compatível com as dependências do projeto. Configure as variáveis de ambiente do Supabase para o ambiente de desenvolvimento e instale as dependências usando o arquivo `bun.lock`.

```sh
bun install --frozen-lockfile
bun run dev
```

## Verificações

```sh
bun run test
bun run test:db
bunx tsc --noEmit
bun run build
bun run lint
```

As regras de contribuição ficam em `AGENTS.md`. As tabelas e regras persistidas são definidas pelas migrações SQL; o arquivo `drizzle/schema.ts` vazio não representa o banco completo.

Consulte [correções de integridade e aplicação da migração](docs/audit-corrections.md) antes de disponibilizar a versão corrigida.

Consulte também [exclusão e lixeira](docs/record-trash.md) para aplicar a migração 0016 e entender os vínculos preservados.

## Lovable

Este projeto mantém integração com o [editor Lovable](https://lovable.dev/projects/b15d814b-dd91-4a53-9dbd-84f193080e19). Preserve o histórico publicado e mantenha a branch conectada funcional.

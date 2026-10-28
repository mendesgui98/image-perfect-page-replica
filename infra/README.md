# Infraestrutura — Docker e VPS

A stack roda inteira em Docker: front (SSR), banco PostgreSQL e os serviços do Supabase
self-hosted (Auth, PostgREST, Storage, Kong e Studio). Não há mais dependência do Lovable
nem do Supabase Cloud.

| Serviço | Imagem                                  | Papel                                                        | Porta           |
| ------- | --------------------------------------- | ------------------------------------------------------------ | --------------- |
| web     | build do `Dockerfile` (alvo `web`)      | Front TanStack Start (SSR, Node)                             | 127.0.0.1:3000  |
| migrate | build do `Dockerfile` (alvo `migrator`) | Aplica `supabase/migrations` e termina                       | —               |
| db      | supabase/postgres                       | Banco PostgreSQL 15                                          | 127.0.0.1:54322 |
| auth    | supabase/gotrue                         | Login, cadastro, recuperação de senha                        | interna         |
| rest    | postgrest/postgrest                     | API REST do banco (respeita RLS)                             | interna         |
| storage | supabase/storage-api                    | Arquivos (bucket `jmg-documents`)                            | interna         |
| kong    | kong                                    | Gateway único da API (`/auth/v1`, `/rest/v1`, `/storage/v1`) | 127.0.0.1:8000  |
| studio  | supabase/studio                         | Painel do banco (só via túnel SSH)                           | 127.0.0.1:3001  |
| caddy   | caddy                                   | HTTPS automático (perfil `prod`)                             | 80/443          |

## Rodar localmente

Pré-requisitos: Docker Desktop (ou OrbStack) aberto e Node 22+. Na raiz do projeto:

```sh
bun run stack:up                 # tudo em containers
bun run stack:admin seu@email.com   # depois de criar a conta em /auth
```

O comando cria o `infra/.env` com segredos novos na primeira vez e completa chaves que faltarem.
E-mails de convite e recuperação de senha chegam na caixa de teste (Mailpit) em http://localhost:8025.

Para desenvolver com recarga automática use `bun run dev:all` (banco em Docker, front e API locais).

## Subir na VPS

O deploy é automático: cada merge na `main` roda o CI, publica as imagens `web`, `api` e `migrate`
no GitHub Container Registry e atualiza a VPS por SSH (`.github/workflows/ci.yml` → `infra/vps/deploy.sh`).
O `infra/.env` da VPS é montado pelo workflow a partir das variáveis e segredos do repositório.

Passo a passo completo (VPS, DNS, segredos, primeiro admin): [docs/deploy-vps.md](../docs/deploy-vps.md).

Scripts em `infra/vps/`:

| Script            | Onde roda                  | Função                                                   |
| ----------------- | -------------------------- | -------------------------------------------------------- |
| `setup.sh`        | VPS nova, uma vez, root    | Docker, usuário deploy, firewall, fail2ban, swap, backup |
| `deploy.sh`       | VPS, chamado pelo workflow | Baixa as imagens do commit, migra e reinicia             |
| `create-admin.sh` | VPS, uma vez               | Cria o primeiro administrador (cadastro fica fechado)    |
| `backup.sh`       | VPS, cron diário 03:30     | `pg_dump` do banco + arquivos do Storage, 14 dias        |

Studio e banco: acessar por túnel, nunca pela internet:
`ssh -L 3001:127.0.0.1:3001 -L 54322:127.0.0.1:54322 deploy@IP_DA_VPS`

### Backup

`infra/vps/backup.sh` roda todo dia às 03:30 e guarda em `/opt/jmg/backups`. Para rodar na hora:
`bash /opt/jmg/infra/vps/backup.sh`.

Guarde as cópias fora da VPS (outro servidor ou armazenamento de objetos) e teste a restauração.

## Migrar os dados do Supabase antigo (Lovable Cloud)

Feito uma vez, com o sistema antigo em modo somente leitura:

1. No painel do Supabase antigo, copiar a connection string do banco.
2. Exportar usuários e dados:
   ```sh
   pg_dump "$OLD_DB_URL" --data-only --schema=public --schema=auth \
     --table='auth.users' --table='auth.identities' --table='public.*' -Fc > dados.dump
   ```
3. Subir a stack nova (as migrações criam as tabelas), depois
   `pg_restore --data-only --disable-triggers -d "$NEW_DB_URL" dados.dump`.
4. Arquivos: baixar o bucket `jmg-documents` (Supabase CLI `supabase storage cp -r`) e enviar para o
   Storage novo, mantendo os mesmos caminhos.
5. Os usuários mantêm a senha (o hash vem junto). Conferir login de um admin antes de desligar o antigo.

## Problemas comuns

- **migrate falha com permissão em `storage.objects`**: troque o usuário de `DATABASE_URL` do serviço
  `migrate` para `supabase_admin` (mesma senha).
- **Login funciona local mas não na VPS**: confira as variáveis `APP_DOMAIN`/`API_DOMAIN` e o segredo
  `ANON_KEY` no GitHub. `VITE_*` entra no bundle no build da imagem `web`, então depois de mudá-los
  rode o workflow de novo (Actions → CI/CD → Run workflow).
- **Versões das imagens**: as tags seguem o compose oficial do Supabase de janeiro/2025. Atualize-as
  conferindo o arquivo oficial antes de produção.

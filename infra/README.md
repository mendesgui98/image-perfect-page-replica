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

Pré-requisitos: Docker Desktop (ou Docker Engine + Compose v2) e Node 22.

```sh
cd infra
cp .env.example .env
node ../scripts/generate-keys.mjs   # copie as 4 linhas para o .env
docker compose up -d --build
docker compose logs -f migrate      # deve terminar com "migração(ões) aplicada(s)"
```

- App: http://localhost:3000
- API: http://localhost:8000
- Studio: http://localhost:3001

### Primeiro administrador

Não existe promoção automática. Cadastre-se pelo app e depois:

```sh
docker compose exec db psql -U postgres -c \
  "insert into public.user_roles(user_id, role)
   select id, 'admin' from auth.users where email = 'seu@email.com';"
```

## Subir na VPS

1. VPS com Ubuntu 24.04, 2 vCPU e 4 GB de RAM (mínimo recomendado), Docker instalado.
2. DNS: registros A de `app.seudominio` e `api.seudominio` apontando para o IP da VPS.
3. Firewall: liberar só 22, 80 e 443 (`ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable`).
4. Clonar o repositório, criar `infra/.env` com `SITE_URL`/`API_EXTERNAL_URL` em https e os domínios.
5. `docker compose --profile prod up -d --build`
6. Studio e banco: acessar por túnel, nunca pela internet:
   `ssh -L 3001:127.0.0.1:3001 -L 54322:127.0.0.1:54322 usuario@vps`

### Atualizar a versão

```sh
git pull
docker compose --profile prod up -d --build   # o serviço migrate aplica só as migrações novas
```

### Backup

```sh
# banco (diário, via cron)
docker compose exec -T db pg_dump -U postgres -Fc postgres > backup-$(date +%F).dump
# arquivos
docker run --rm -v jmg-obras_storage-data:/data -v "$PWD":/out alpine \
  tar czf /out/storage-$(date +%F).tgz -C /data .
```

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
- **Login funciona local mas não na VPS**: `SITE_URL` e `API_EXTERNAL_URL` precisam estar em https e o
  front precisa ser reconstruído (`--build`), porque `VITE_*` entra no bundle no momento do build.
- **Versões das imagens**: as tags seguem o compose oficial do Supabase de janeiro/2025. Atualize-as
  conferindo o arquivo oficial antes de produção.

#!/usr/bin/env bash
# SUBSTITUI os dados de produção pelos exportados com scripts/export-data.sh.
# Na VPS, com dados.dump, arquivos.tgz e versao.txt em /opt/jmg/import:
#   bash /opt/jmg/infra/vps/import-data.sh
# Faz backup antes (backup.sh), para web e api durante a cópia e as liga de novo no final.
set -euo pipefail
cd "$(dirname "$0")/.."
src="${IMPORT_DIR:-/opt/jmg/import}"
compose() { docker compose --profile prod "$@"; }
# </dev/null: sem isso o exec consome a entrada do terminal (e a confirmação digitada).
psql_q() { compose exec -T db psql -U supabase_admin -h 127.0.0.1 -v ON_ERROR_STOP=1 -q "$@" </dev/null; }

for f in dados.dump arquivos.tgz versao.txt; do
  [ -f "$src/$f" ] || { echo "Falta $src/$f (gere com scripts/export-data.sh)."; exit 1; }
done

local_v=$(tr -d '[:space:]' < "$src/versao.txt")
prod_v=$(psql_q -tAc "select max(version) from supabase_migrations.schema_migrations" | tr -d '[:space:]')
if [ "$local_v" != "$prod_v" ]; then
  echo "Versões diferentes: local $local_v, produção $prod_v."
  echo "Atualize o projeto local (git pull na main + bun run stack:up) e exporte de novo."
  exit 1
fi

echo "Isso APAGA todos os dados e usuários da produção e coloca os do arquivo no lugar."
read -rp "Digite SUBSTITUIR para continuar: " answer
[ "$answer" = "SUBSTITUIR" ] || { echo "Cancelado."; exit 1; }

echo "==> Backup da produção antes de importar"
bash vps/backup.sh </dev/null

echo "==> Parando web e api"
compose stop web api

restore_ok=0
trap '[ $restore_ok = 1 ] || echo "!! Falhou. Nada foi apagado se o erro veio antes da troca; o backup está em /opt/jmg/backups."; compose start storage web api >/dev/null 2>&1 || true' EXIT

echo "==> Trocando os dados do banco (uma transação: se algo falhar, nada muda)"
tables=$(psql_q -tAc "select string_agg(format('%I.%I', schemaname, tablename), ', ')
  from pg_tables where schemaname = 'public'
     or (schemaname, tablename) in (('auth','users'),('auth','identities'),('auth','mfa_factors'),
                                     ('storage','buckets'),('storage','objects'))")
compose exec -T db sh -c "cat > /tmp/dados.dump" < "$src/dados.dump"
compose exec -T db sh -c "pg_restore --data-only --disable-triggers -f /tmp/dados.sql /tmp/dados.dump && rm /tmp/dados.dump" </dev/null
{
  echo "set client_min_messages = warning;"
  echo "begin;"
  echo "truncate $tables cascade;"
  echo "\\i /tmp/dados.sql"
  echo "commit;"
} | compose exec -T db psql -U supabase_admin -h 127.0.0.1 -v ON_ERROR_STOP=1 -q -o /dev/null
compose exec -T db rm -f /tmp/dados.sql </dev/null

echo "==> Arquivos do Storage"
compose stop storage
docker run --rm -v jmg-obras_storage-data:/data -v "$src":/in:ro debian:12-slim \
  sh -c 'find /data -mindepth 1 -delete && tar --xattrs --xattrs-include="*" -xzf /in/arquivos.tgz -C /data'
compose start storage

restore_ok=1
echo "==> Ligando web e api"
compose start web api >/dev/null
psql_q -tAc "select 'usuários: ' || count(*) from auth.users"
psql_q -tAc "select 'arquivos: ' || count(*) from storage.objects"
echo "Pronto. Entre com o e-mail e a senha que você usava no sistema local."

#!/usr/bin/env bash
# Backup do banco (pg_dump) e dos arquivos enviados (Storage). Agendado pelo setup.sh (cron diário).
# Guarda 14 dias em /opt/jmg/backups. Copie para fora da VPS também (veja docs/deploy-vps.md).
set -euo pipefail
cd "$(dirname "$0")/.."
dest="${BACKUP_DIR:-/opt/jmg/backups}"
keep="${BACKUP_DAYS:-14}"
stamp=$(date +%F-%H%M)
mkdir -p "$dest"

docker compose exec -T db pg_dump -U supabase_admin -h 127.0.0.1 -Fc postgres > "$dest/db-$stamp.dump.tmp"
mv "$dest/db-$stamp.dump.tmp" "$dest/db-$stamp.dump"
docker run --rm -v jmg-obras_storage-data:/data:ro -v "$dest":/out alpine:3 \
  tar czf "/out/storage-$stamp.tgz" -C /data .

find "$dest" -maxdepth 1 \( -name 'db-*.dump' -o -name 'storage-*.tgz' \) -mtime +"$keep" -delete
echo "$(date '+%F %T') backup ok: db-$stamp.dump storage-$stamp.tgz"

#!/usr/bin/env bash
# Exporta os dados da stack LOCAL (bun run stack:up / dev:all) para levar à produção.
# Na raiz do projeto:  bash scripts/export-data.sh
# Gera jmg-export/ com dados.dump (banco), arquivos.tgz (Storage) e versao.txt (última migração).
# Depois siga docs/deploy-vps.md, "Levar os dados locais para a produção".
set -euo pipefail
cd "$(dirname "$0")/../infra"
out="../jmg-export"
mkdir -p "$out"

docker compose ps db --format '{{.State}}' | grep -q running || {
  echo "O banco local não está rodando. Rode: bun run stack:up"; exit 1; }

docker compose exec -T db psql -U postgres -tAc \
  "select max(version) from supabase_migrations.schema_migrations" > "$out/versao.txt"

# Dados do app (public), contas (auth: usuários, identidades, 2FA) e registros dos arquivos (storage).
docker compose exec -T db pg_dump -U supabase_admin -h 127.0.0.1 -Fc --data-only \
  -t 'public.*' -t auth.users -t auth.identities -t auth.mfa_factors \
  -t storage.buckets -t storage.objects postgres > "$out/dados.dump"

# Arquivos enviados (fotos, documentos, PDFs de versões).
# GNU tar com --xattrs: o Storage guarda tipo e etag de cada arquivo em atributos estendidos.
docker run --rm -v jmg-obras_storage-data:/data:ro -v "$(cd "$out" && pwd)":/out debian:12-slim \
  tar --xattrs --xattrs-include='*' -czf /out/arquivos.tgz -C /data .

echo "Pronto: jmg-export/ (versão do banco $(cat "$out/versao.txt"))"
ls -lh "$out"

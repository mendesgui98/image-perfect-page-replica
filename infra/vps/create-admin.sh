#!/usr/bin/env bash
# Cria a primeira conta de administrador (o cadastro aberto fica desligado em produção).
# Na VPS:  bash /opt/jmg/infra/vps/create-admin.sh seu@email.com
set -euo pipefail
cd "$(dirname "$0")/.."
email="${1:-}"
[ -n "$email" ] || { echo "Uso: create-admin.sh seu@email.com"; exit 1; }
key=$(grep '^SERVICE_ROLE_KEY=' .env | cut -d= -f2-)
port=$(grep '^KONG_PORT=' .env | cut -d= -f2- || true)

read -rsp "Senha para $email (mín. 8 caracteres): " password; echo
body=$(EMAIL="$email" PASSWORD="$password" python3 -c \
  'import json,os; print(json.dumps({"email":os.environ["EMAIL"],"password":os.environ["PASSWORD"],"email_confirm":True}))')

status=$(curl -sS -o /tmp/jmg-admin.json -w '%{http_code}' -X POST "http://127.0.0.1:${port:-8000}/auth/v1/admin/users" \
  -H "apikey: $key" -H "Authorization: Bearer $key" -H "Content-Type: application/json" -d "$body")
if [ "$status" != "200" ] && ! grep -qi "already" /tmp/jmg-admin.json; then
  echo "Não consegui criar a conta ($status): $(cat /tmp/jmg-admin.json)"; rm -f /tmp/jmg-admin.json; exit 1
fi
rm -f /tmp/jmg-admin.json

sql="insert into public.user_roles(user_id, role)
  select id, 'admin' from auth.users where lower(email) = lower(:'email') on conflict do nothing;"
docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -q -v email="$email" <<<"$sql"
echo "Pronto: $email é administrador. Entre em https://$(grep '^APP_DOMAIN=' .env | cut -d= -f2-)"

#!/usr/bin/env bash
# Prepara uma VPS Ubuntu 24.04 nova para a JMG Obras. Rode UMA vez, como root.
#
# Do seu computador, na pasta do projeto:
#   ssh root@IP_DA_VPS "bash -s -- '$(cat ~/.ssh/jmg-deploy.pub)'" < infra/vps/setup.sh
#
# O argumento é a chave PÚBLICA que o GitHub Actions usa para entrar como "deploy".
# Instala Docker, cria o usuário deploy, liga firewall (22/80/443), fail2ban,
# atualizações automáticas de segurança, swap e o backup diário.
set -euo pipefail

PUBKEY="${1:-}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR=/opt/jmg

[ "$(id -u)" -eq 0 ] || { echo "Rode como root."; exit 1; }
[ -n "$PUBKEY" ] || { echo "Uso: setup.sh 'ssh-ed25519 AAAA... github-actions'"; exit 1; }
. /etc/os-release
[ "$ID" = "ubuntu" ] || { echo "Este script é para Ubuntu (encontrado: $ID)."; exit 1; }

export DEBIAN_FRONTEND=noninteractive
echo "==> Fuso horário e pacotes"
timedatectl set-timezone America/Sao_Paulo || true
apt-get update -q
apt-get -y -q upgrade
apt-get install -y -q ca-certificates curl ufw fail2ban unattended-upgrades python3

echo "==> Docker (repositório oficial)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Logs dos containers com tamanho limitado (não enchem o disco).
cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
systemctl enable --now docker
systemctl restart docker

echo "==> Usuário $DEPLOY_USER"
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"
home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$home/.ssh"
touch "$home/.ssh/authorized_keys"
grep -qxF "$PUBKEY" "$home/.ssh/authorized_keys" || echo "$PUBKEY" >> "$home/.ssh/authorized_keys"
# Quem já entra como root com chave também entra como deploy.
[ -f /root/.ssh/authorized_keys ] && cat /root/.ssh/authorized_keys >> "$home/.ssh/authorized_keys"
sort -u -o "$home/.ssh/authorized_keys" "$home/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "$home/.ssh/authorized_keys"
chmod 600 "$home/.ssh/authorized_keys"

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/infra"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/backups"

echo "==> Swap de 2 GB"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall (22, 80, 443)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "==> fail2ban e atualizações automáticas"
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Backup diário às 03:30 (banco + arquivos, 14 dias em $APP_DIR/backups)"
cat > /etc/cron.d/jmg-backup <<CRON
30 3 * * * $DEPLOY_USER [ -x $APP_DIR/infra/vps/backup.sh ] && $APP_DIR/infra/vps/backup.sh >> $APP_DIR/backups/backup.log 2>&1
CRON

echo
echo "Pronto. Próximos passos em docs/deploy-vps.md (segredos no GitHub e primeiro deploy)."
echo "Teste o acesso do deploy: ssh -i ~/.ssh/jmg-deploy $DEPLOY_USER@$(hostname -I | awk '{print $1}')"

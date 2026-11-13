#!/bin/sh
# Prepares a fresh Debian 12 or Ubuntu 24.04 machine for the coach, once, as root: node 22 and Caddy from their own
# apt repositories, a `coach` user that owns nothing but its data, the systemd units, Caddy's site and a daily backup.
# deploy.sh runs it (`sh deploy/deploy.sh root@<host> --setup <domain>`); running it again changes nothing that is
# already set up, except that it rewrites the Caddyfile and the units from this directory.
#
#     sh setup.sh <domain>
set -eu
domain=${1:?usage: setup.sh <domain>}
case "$domain" in
  *[!a-z0-9.-]* | "" | .* | *..*) echo "setup: \"$domain\" is not a domain name" >&2; exit 2 ;;
esac
here=$(cd "$(dirname "$0")" && pwd)
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg rsync debian-keyring debian-archive-keyring apt-transport-https unattended-upgrades
install -d -m 0755 /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/nodesource.gpg ]; then
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
fi
if [ ! -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg ]; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
fi
apt-get update
apt-get install -y nodejs caddy

id coach >/dev/null 2>&1 || useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin coach
install -d -m 0755 /opt/coach /opt/coach/releases
install -d -m 0750 /etc/coach
[ -f /etc/coach/coach.env ] || sed "s/COACH_DOMAIN/$domain/" "$here/coach.env.example" > /etc/coach/coach.env
install -m 0644 "$here/coach.service" "$here/coach-backup.service" "$here/coach-backup.timer" /etc/systemd/system/
sed "s/COACH_DOMAIN/$domain/" "$here/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

systemctl daemon-reload
systemctl enable coach
systemctl enable --now coach-backup.timer
systemctl reload caddy || systemctl restart caddy
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
fi
echo "setup: ready for $domain; the coach starts with the first deploy"

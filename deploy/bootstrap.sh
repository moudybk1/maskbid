#!/usr/bin/env bash
# One-shot setup of a fresh Ubuntu/Debian VPS, run as root. Safe to run again (it updates and rebuilds).
#   NEAR_RPC_URL='https://...quiknode.pro/<token>/' [DOMAIN=maskbid.example.com] [SSH_PUBKEY='ssh-ed25519 ...'] bash bootstrap.sh
# Without DOMAIN the app is served over plain HTTP on the server's IP (port 80); rerun with DOMAIN set once its A record points here.
set -euo pipefail
: "${NEAR_RPC_URL:?set NEAR_RPC_URL to the private QuickNode testnet endpoint}"
DOMAIN="${DOMAIN:-:80}"
REPO=https://github.com/moudybk1/maskbid-aurora.git
DIR=/opt/maskbid

if [ -n "${SSH_PUBKEY:-}" ]; then
  mkdir -p ~/.ssh && touch ~/.ssh/authorized_keys
  grep -qxF "$SSH_PUBKEY" ~/.ssh/authorized_keys || echo "$SSH_PUBKEY" >> ~/.ssh/authorized_keys
  chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
fi

# The image build needs about 2 GB: add swap on small servers.
if [ "$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)" -lt 1900 ] && [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

command -v git >/dev/null || { apt-get update -y && apt-get install -y git curl; }
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
# Ports 80/443 may already belong to another site on this server (its own Caddy/nginx): then leave them alone and publish the app on 8080.
if docker ps --format '{{.Names}}' | grep -q '^deploy-caddy'; then PROXY=1 # our own proxy from an earlier run
elif ss -ltn | grep -qE ':(80|443) '; then PROXY=0; else PROXY=1; fi
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 22/tcp
  if [ "$PROXY" = 1 ]; then ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp; else ufw allow 8080/tcp; fi
fi

if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone "$REPO" "$DIR"; fi
cd "$DIR/deploy"

IP="$(hostname -I | awk '{print $1}')"
umask 077
if [ "$PROXY" = 0 ]; then
  ORIGIN="http://$IP:8080"
  printf 'DOMAIN=%s\nAPP_ORIGIN=%s\nNEAR_RPC_URL=%s\nWEB_PUBLISH=8080\n' "$DOMAIN" "$ORIGIN" "$NEAR_RPC_URL" > .env
else
  if [ "$DOMAIN" = ":80" ]; then ORIGIN="http://$IP"; else ORIGIN="https://$DOMAIN"; fi
  printf 'DOMAIN=%s\nAPP_ORIGIN=%s\nNEAR_RPC_URL=%s\nCOMPOSE_PROFILES=proxy\n' "$DOMAIN" "$ORIGIN" "$NEAR_RPC_URL" > .env
fi

docker compose up -d --build
echo "Done: $ORIGIN"

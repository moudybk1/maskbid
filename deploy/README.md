# Deploy to a VPS

One server, two containers: the Next.js app and Caddy (HTTPS certificate included). Nothing else is needed: chain access goes through
`/api/rpc` to your QuickNode endpoint, and lot metadata lives in a Docker volume.

## Fastest path: one command

On a fresh server, as root (web console is fine), with your private QuickNode testnet URL:

```bash
curl -fsSL https://raw.githubusercontent.com/moudybk1/maskbid/main/deploy/bootstrap.sh | NEAR_RPC_URL='https://...' bash
```

It installs Docker, opens the firewall, clones the repo to `/opt/maskbid` and starts everything on plain HTTP at the server's IP. Once you have a
domain and its A record points to the server, run it again with `DOMAIN=<domain>` in front of `bash` and it switches to HTTPS.

If ports 80/443 are already used by another site on the server, the script leaves them alone and serves the app on
`http://<ip>:8080` instead (no Caddy of ours). To put it on a domain there, add a `reverse_proxy 127.0.0.1:8080` block for that domain
to the existing proxy.

The manual steps follow.

## 1. Server

- Ubuntu 24.04, **2 GB RAM** or more (the image build needs it; with 1 GB add 2 GB of swap first), 1 vCPU, 20 GB disk.
- Firewall: allow 22, 80, 443 (TCP) and 443 (UDP, for HTTP/3).
- Install Docker: `curl -fsSL https://get.docker.com | sh`

## 2. Domain

At your registrar create an **A record** `maskbid.<yourdomain>` (or the bare domain) pointing to the server's IPv4 address. Wait until
`dig +short <domain>` shows it. Caddy cannot get a certificate before that.

## 3. First deploy

```bash
git clone https://github.com/moudybk1/maskbid.git && cd maskbid/deploy
cp .env.example .env && nano .env      # DOMAIN, APP_ORIGIN (https://<domain>), NEAR_RPC_URL (QuickNode, testnet)
docker compose up -d --build
```

Open `https://<domain>`. First start copies the 7 existing lots' metadata (`apps/web/metadata-seed`) into the volume.

## Update

```bash
cd maskbid && git pull && cd deploy && docker compose up -d --build
```

## Operate

| What | Command (in `deploy/`) |
|---|---|
| Logs | `docker compose logs -f web` |
| Restart | `docker compose restart web` |
| Back up lot metadata | `docker run --rm -v deploy_metadata:/d -v $PWD:/b alpine tar czf /b/metadata.tgz -C /d .` |

Metadata files are content-addressed (the file name is the SHA-256 of its bytes, checked against the chain by the app), so a lost volume
can be rebuilt from the seed files plus any lots created since; back it up if you create lots on the server.

## Notes

- `NEAR_RPC_URL` is read by the server only. `/api/rpc` forwards four read/broadcast methods and has no rate limit: if the endpoint's
  quota matters, add one (for example Cloudflare in front of the domain, or `fail2ban` on Caddy's access log).
- Contract and token are the defaults in `apps/web/src/lib/config.ts` (`maskbid-v2.testnet` / `maskbid-usdc.testnet`). To point at another
  deployment change them there and rebuild: `NEXT_PUBLIC_` values are baked in at build time, so the runtime `.env` cannot change them.
- Do not set `NEAR_DEMO_ACCOUNTS` here. It is a localhost-only convenience and the server has no near-cli keychain anyway.
- Verified locally only as a standalone Next build run directly (seed read, new metadata write, RPC proxy, pages). The Docker image itself was
  not built here because Docker Desktop was not running; the first `docker compose up --build` on the server is its first build.

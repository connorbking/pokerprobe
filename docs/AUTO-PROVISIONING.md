# Auto DNS provisioning (Stripe → Cloudflare → Desktop tab)

On **`checkout.session.completed`**, when enabled, PokerProbe:

1. Creates `servers/{id}` with unique 8-char `serverSlug` (already done)
2. Creates Cloudflare **A record**: `{serverSlug}.pokerprobe.com` → origin IP
3. Sets **`guacamoleUrl`** (Myrtille desktop URL) on the server record
4. Optionally marks the server **`active`** so the Dashboard Desktop tab works immediately

## Lab setup (home Myrtille via port-forward)

**Origin IP and port** are stored in Firestore — not Worker env vars:

- **`config/provisioning`** — platform defaults (auto-created on first checkout)
- **`servers/{id}.ip`** and **`servers/{id}.originPort`** — set on each checkout

Built-in fallbacks when the config doc does not exist yet: `173.70.205.120` / no port (443 via Cloudflare). Optional env vars `PROVISION_ORIGIN_IP` and `PROVISION_ORIGIN_PORT` only apply when seeding that doc.

Set these in **Cloudflare Workers → pokerprobe → Settings → Variables and secrets**:

| Name | Type | Example (lab) |
|------|------|----------------|
| `PROVISION_DNS_ENABLED` | Variable | `true` |
| `PROVISION_DNS_PROXIED` | Variable | `false` (required for non-443 port) |
| `PROVISION_AUTO_ACTIVATE` | Variable | `true` |
| `PROVISION_DNS_DELETE_ON_TERMINATE` | Variable | `true` |
| `CLOUDFLARE_ZONE_ID` | Secret | Zone id for `pokerprobe.com` |
| `CLOUDFLARE_API_TOKEN` | Secret | Token with **Zone → DNS → Edit** |

Optional (seed only): `PROVISION_ORIGIN_IP`, `PROVISION_ORIGIN_PORT` — override lab defaults when `config/provisioning` is first created.

Local `.env.local` — same keys for webhook testing via Stripe CLI.

### Cloudflare API token

1. [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create token → **Edit zone DNS** template → zone = `pokerprobe.com`
3. Paste token into `CLOUDFLARE_API_TOKEN`

### Zone ID

Cloudflare → **pokerprobe.com** → Overview → **Zone ID** (right column)

## Health check

```bash
curl https://www.pokerprobe.com/api/health/provision
```

Expect `"configured": true` and `defaults.defaultOriginIp` / `defaults.defaultOriginPort` from Firestore.

## What gets created

| Checkout | Cloudflare DNS | Firestore |
|----------|----------------|-----------|
| `serverSlug: k7m2p9xq` | `k7m2p9xq.pokerprobe.com` A → server `ip` | `ip`, `originPort`, `guacamoleUrl`, `hostname`, `active` |

Desktop URL:

```text
https://k7m2p9xq.pokerprobe.com/myrtille
```

## Test flow

1. Set env vars above on the **deployed Worker** (Redeploy or Retry if needed)
2. Ensure Myrtille is reachable at `https://{serverSlug}.pokerprobe.com/myrtille` (orange cloud + nginx)
3. Router: forward **443** → nginx (not directly to Win11)
4. Complete a **Stripe test checkout** on your account
5. Check Cloudflare DNS for new `*.youruser.pokerprobe.com` record
6. Dashboard → **Manage server** → **Desktop** tab

## Production (Hetzner later)

| Lab (now) | Production |
|-----|------------|
| `config/provisioning` + per-server `ip` / `originPort` | Hetzner API writes VM IP onto each server record |
| `originPort: null` | `443` or unset (Cloudflare proxied) |
| `PROVISION_DNS_PROXIED=false` | `true` (orange cloud) when origin is 443 |
| `PROVISION_AUTO_ACTIVATE=true` | `false` until VM + Myrtille ready, then activate via API/script |

When each Hetzner VM gets its own IP, update the server record (`ip`, optionally `originPort`) then run DNS provision — same Cloudflare path as today.

## Cancellation

`customer.subscription.deleted` deletes the Cloudflare DNS record when `PROVISION_DNS_DELETE_ON_TERMINATE=true` and `cloudflareDnsRecordId` is stored on the server.

## SSL note (lab)

Myrtille/IIS often ships with a self-signed cert for **IP or localhost**, not `{serverSlug}.pokerprobe.com`. That causes Chrome **“incorrect credentials”** / HSTS blocks.

```powershell
.\scripts\myrtille-bind-ssl.ps1 -Hostname k7m2p9xq.pokerprobe.com
```

Then test:

```text
https://k7m2p9xq.pokerprobe.com/myrtille
```

**Limits:** Self-signed is still **not publicly trusted**. HSTS on `pokerprobe.com` may prevent bypass — clear locally at `chrome://net-internals/#hsts` for dev, or use **Cloudflare proxy (orange cloud)** for a trusted edge cert later.

## Manual fallback

If auto-provision is off or fails, use:

```bash
npm run server-admin -- activate srv_xxx \
  --guacamole-url "https://k7m2p9xq.pokerprobe.com/myrtille"
```

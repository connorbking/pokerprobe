# Auto DNS provisioning (Stripe → Cloudflare → Desktop tab)

On **`checkout.session.completed`**, when enabled, PokerProbe:

1. Creates `servers/{id}` with `serverSlug` + `userSlug` (already done)
2. Creates Cloudflare **A record**: `{serverSlug}.{userSlug}.pokerprobe.com` → origin IP
3. Sets **`guacamoleUrl`** (Myrtille desktop URL) on the server record
4. Optionally marks the server **`active`** so the Dashboard Desktop tab works immediately

## Lab setup (home Myrtille via port-forward)

Set these in **Cloudflare Workers → pokerprobe → Settings → Variables and secrets**:

| Name | Type | Example (lab) |
|------|------|----------------|
| `PROVISION_DNS_ENABLED` | Variable | `true` |
| `PROVISION_ORIGIN_IP` | Variable | `173.70.205.120` |
| `PROVISION_ORIGIN_PORT` | Variable | `8787` |
| `PROVISION_DNS_PROXIED` | Variable | `false` (required for non-443 port) |
| `PROVISION_AUTO_ACTIVATE` | Variable | `true` |
| `PROVISION_DNS_DELETE_ON_TERMINATE` | Variable | `true` |
| `CLOUDFLARE_ZONE_ID` | Secret | Zone id for `pokerprobe.com` |
| `CLOUDFLARE_API_TOKEN` | Secret | Token with **Zone → DNS → Edit** |

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

Expect `"configured": true` and your origin IP/port reflected in the status object.

## What gets created

| Checkout | Cloudflare DNS | Firestore |
|----------|----------------|-----------|
| `userSlug: jsmith` | — | on user doc |
| `serverSlug: g76t4` | `g76t4.jsmith.pokerprobe.com` A → `173.70.205.120` | `guacamoleUrl`, `hostname`, `ip`, `active` |

Desktop URL (lab with port 8787):

```text
https://g76t4.jsmith.pokerprobe.com:8787/myrtille
```

## Test flow

1. Set env vars above on the **deployed Worker** (Redeploy or Retry if needed)
2. Ensure Myrtille is reachable at `https://173.70.205.120:8787/myrtille` (or LAN test first)
3. Router: forward **8787** → Win11 IIS **443** (or whatever IIS uses)
4. Complete a **Stripe test checkout** on your account
5. Check Cloudflare DNS for new `*.youruser.pokerprobe.com` record
6. Dashboard → **Manage server** → **Desktop** tab

## Production (Hetzner later)

| Lab | Production |
|-----|------------|
| `PROVISION_ORIGIN_IP=173.70.205.120` | Hetzner VM public IP per server |
| `PROVISION_ORIGIN_PORT=8787` | unset or `443` |
| `PROVISION_DNS_PROXIED=false` | `true` (orange cloud) when origin is 443 |
| `PROVISION_AUTO_ACTIVATE=true` | `false` until VM + Myrtille ready, then activate via API/script |

When each Hetzner VM gets its own IP, auto-provision runs with that IP instead of the shared lab IP (future: pass IP from Hetzner API into the same function).

## Cancellation

`customer.subscription.deleted` deletes the Cloudflare DNS record when `PROVISION_DNS_DELETE_ON_TERMINATE=true` and `cloudflareDnsRecordId` is stored on the server.

## SSL note (lab)

Your Myrtille cert may be for IP/localhost, not `g76t4.jsmith.pokerprobe.com`. Browsers may warn on the subdomain until you add an IIS binding + cert for that hostname (or use Cloudflare origin cert in prod).

## Manual fallback

If auto-provision is off or fails, use:

```bash
npm run server-admin -- activate srv_xxx \
  --guacamole-url "https://g76t4.jsmith.pokerprobe.com:8787/myrtille"
```

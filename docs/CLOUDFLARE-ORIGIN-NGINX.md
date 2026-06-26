# Cloudflare Origin SSL + nginx proxy (desktop subdomains)

Myrtille works over **HTTP** behind nginx. Browsers need **HTTPS** for the PokerProbe iframe. Use **Cloudflare proxy** for the trusted cert; use **origin certs on nginx** for the Cloudflare → nginx leg.

## How the pieces fit

```text
Browser ──HTTPS (Cloudflare Universal SSL)──► Cloudflare edge
Cloudflare ──HTTPS (your origin cert)──► nginx :443
nginx ──HTTP──► Win11 IIS :80 /myrtille (LAN only — no router forward to Win11)
```

Public URL: `https://{serverSlug}.pokerprobe.com/myrtille` → nginx proxies the full `/myrtille/...` path to `http://10.80.30.139:80`.

Origin certificates in `/etc/ssl/cloudflare/` are **not** trusted by browsers directly. They only matter between Cloudflare and nginx.

## Step 1 — Check your existing origin cert

On the nginx server:

```bash
sudo openssl x509 -in /etc/ssl/cloudflare/pokerprobe.com.crt -noout -text | grep -A1 "Subject Alternative Name"
```

Typical Cloudflare origin cert covers:

- `pokerprobe.com`
- `*.pokerprobe.com` (one label only: `foo.pokerprobe.com`)

It does **not** cover legacy two-level names like `k7m2p9xq.pokerprobe.com`. New servers use flat 8-char slugs (`k7m2p9xq.pokerprobe.com`) covered by `*.pokerprobe.com`.

That is OK if you use Cloudflare **Full** (not strict). For **Full (strict)**, add each lab hostname to a new origin cert (below).

## Step 2 — Create or update origin certificate (if needed)

Cloudflare Dashboard → **SSL/TLS → Origin Server → Create Certificate**

Hostnames to include:

```text
pokerprobe.com
*.pokerprobe.com
k7m2p9xq.pokerprobe.com
```

(Add each new `{serverSlug}.pokerprobe.com` to origin cert if using Full strict.)

Save to nginx server:

```bash
sudo nano /etc/ssl/cloudflare/pokerprobe.com.crt   # paste certificate
sudo nano /etc/ssl/cloudflare/pokerprobe.com.key   # paste private key
sudo chmod 600 /etc/ssl/cloudflare/pokerprobe.com.key
sudo nginx -t && sudo systemctl reload nginx
```

## Step 3 — Cloudflare DNS (required for browser HTTPS)

For the desktop A record (`k7m2p9xq`):

| Setting | Value |
|---------|--------|
| Type | A |
| Name | `k7m2p9xq` (→ `k7m2p9xq.pokerprobe.com`) |
| Content | nginx server public IP |
| Proxy | **Proxied (orange cloud)** |

Grey cloud = browser hits your origin directly = self-signed / wrong cert / HSTS pain.

## Step 4 — Cloudflare SSL mode

**SSL/TLS → Overview:**

| Mode | When to use |
|------|-------------|
| **Full (strict)** | Origin cert includes the exact desktop hostname (Step 2) |
| **Full** | Origin cert only covers `*.pokerprobe.com` — Cloudflare accepts it for two-level hosts anyway (good lab default) |
| **Flexible** | Cloudflare → nginx on **port 80** only; use the HTTP desktop block in nginx; no origin cert needed for desktop |

Recommended lab path: **Proxied + Full** with existing `/etc/ssl/cloudflare/` files.

## Step 5 — nginx (subdomain → Myrtille)

Each desktop hostname must have a `server` block that proxies **`/myrtille`** to Win11:

```nginx
server {
    listen 443 ssl http2;
    server_name grlnofp8.pokerprobe.com;   # or regex for all 8-char slugs

    ssl_certificate     /etc/ssl/cloudflare/pokerprobe.com.crt;
    ssl_certificate_key /etc/ssl/cloudflare/pokerprobe.com.key;

    location /myrtille {
        proxy_pass http://10.80.30.139:80;   # Win11 IIS Myrtille
        proxy_set_header Host 10.80.30.139;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location = / {
        return 302 /myrtille/;
    }
}
```

Ready-made configs:

| File | When to use |
|------|-------------|
| `docs/nginx-slug.example.conf` | One server (e.g. `grlnofp8`) — **recommended if connorking/daid already on nginx** |
| `docs/nginx-pokerprobe-desktop.conf` | All 8-char slugs via regex |
| `docs/nginx-pokerprobe.conf` | Desktop + www on a fresh nginx host |

Router: forward **443** → nginx (not 8787 → Win11).

## Step 6 — PokerProbe URLs

After orange cloud + 443, desktop URL should be:

```text
https://k7m2p9xq.pokerprobe.com/myrtille
```

No `:8787`. Update Worker vars:

- `PROVISION_DNS_PROXIED=true`
- Firestore `config/provisioning` → `defaultOriginPort`: null

## Step 7 — Clear old HSTS (once)

Chrome: `chrome://net-internals/#hsts` → delete `pokerprobe.com`

## Verify

```bash
curl -I https://k7m2p9xq.pokerprobe.com/myrtille
```

Browser should show padlock (via Cloudflare). Myrtille login page over **https://**.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Not secure" / HTTP only | A record not proxied (orange cloud) |
| 525 SSL handshake failed | nginx not listening 443 or wrong cert path |
| 526 Invalid SSL certificate | Use **Full** not strict, or add hostname to origin cert |
| Redirect to www | Old nginx config without desktop `server_name` block |
| Redirect to connorking.com (or wrong site) | Desktop block not in `sites-enabled`; connorking is `default_server` on :443 |
| Myrtille loads on HTTP but not HTTPS | Enable orange cloud + use 443 nginx block |

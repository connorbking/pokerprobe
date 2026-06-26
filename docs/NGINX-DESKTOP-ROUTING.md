# nginx routing for desktop subdomains

## Symptom

`https://grlnofp8.pokerprobe.com/myrtille` → redirects to **connorking.com** (or wrong site), while `http://10.80.30.139/myrtille/...` works on LAN.

## Why regex config alone often fails

nginx picks a `server` block in this order:

1. **Exact** `server_name` (e.g. `grlnofp8.pokerprobe.com`) ← **daid.pokerprobe.com uses this**
2. **Wildcard** (e.g. `*.pokerprobe.com`)
3. **Regex** (e.g. `~^[a-z0-9]{8}\.pokerprobe\.com$`) ← our desktop conf
4. **default_server** (first site in `sites-enabled`, often connorking.com)

So `nginx-pokerprobe-desktop.conf` **loses** to any existing `*.pokerprobe.com` block, and **loses** to `default_server` if the regex file is not loaded at all.

## Diagnose on the nginx box

```bash
# What handles this host?
sudo nginx -T 2>/dev/null | grep -E "server_name|listen.*443|default_server"

# Simulate routing locally (bypasses Cloudflare/DNS)
curl -sI -H "Host: grlnofp8.pokerprobe.com" http://127.0.0.1/myrtille
curl -sI -H "Host: grlnofp8.pokerprobe.com" https://127.0.0.1/myrtille -k

# Good: 302/200 toward /myrtille on Win11
# Bad:  Location: https://connorking.com/...
```

Find the block that steals traffic:

```bash
sudo nginx -T 2>/dev/null | grep -B20 "connorking.com" | head -40
sudo grep -r "pokerprobe" /etc/nginx/sites-enabled/
```

## Fix A — Immediate (one slug, matches daid / Proxmox pattern)

Use an **exact** hostname file (highest priority):

```bash
sudo cp docs/nginx-slug.example.conf /etc/nginx/sites-available/grlnofp8.pokerprobe.com
sudo sed -i 's/SLUG/grlnofp8/g' /etc/nginx/sites-available/grlnofp8.pokerprobe.com
sudo ln -sf /etc/nginx/sites-available/grlnofp8.pokerprobe.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -sI -H "Host: grlnofp8.pokerprobe.com" http://127.0.0.1/myrtille
```

No upstream block, no map — same structure as `daid.pokerprobe.com`.

## Fix B — All future 8-char slugs (regex)

1. **Remove or narrow** any `server_name *.pokerprobe.com;` that does not proxy `/myrtille`.
2. Change connorking to **only** `server_name connorking.com www.connorking.com;` — not `_` or wildcard.
3. Enable desktop-only conf:

```bash
sudo cp docs/nginx-pokerprobe-desktop.conf /etc/nginx/sites-available/pokerprobe-desktop
sudo ln -sf /etc/nginx/sites-available/pokerprobe-desktop /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

4. Do **not** also enable the full `nginx-pokerprobe.conf` if www/apex live elsewhere (duplicate `server_name`).

## Fix C — Add `/myrtille` to existing wildcard pokerprobe server

If one file already owns `*.pokerprobe.com`, add the `location /myrtille { ... }` block from `nginx-slug.example.conf` **inside that same** `server { }` instead of a separate file.

## Backend (Win11)

Myrtille is on **IIS port 80**, path **`/myrtille`**:

```text
http://10.80.30.139/myrtille/(S(...))/Default.aspx
```

nginx must use:

- `proxy_pass http://10.80.30.139:80;` (full URI kept)
- `proxy_set_header Host 10.80.30.139;` (same as hitting the IP directly)

Port **8080** is internal ServicesHost — do not proxy to it from nginx.

## Cloudflare

Desktop A record should be **proxied** (orange cloud). Grey cloud / local DNS pointing at home IP bypasses Cloudflare and causes cert errors.

```bash
nslookup grlnofp8.pokerprobe.com 1.1.1.1
# Proxied: 104.x.x.x or 172.x.x.x — not 173.70.205.120
```

## nginx restart failed (`Job for nginx.service failed`)

**Never run `service nginx restart` first.** Always test:

```bash
sudo nginx -t
```

That prints the **exact file and line** (duplicate name, missing cert, syntax error).

### Common errors on qbmc (connorking + daid already enabled)

| `nginx -t` message | Fix |
|--------------------|-----|
| `conflicting server name "www.pokerprobe.com"` | Do **not** enable full `nginx-pokerprobe.conf`. Use `nginx-slug.example.conf` only. |
| `conflicting server name "pokerprobe.com"` | Same — remove/disable the full pokerprobe site from `sites-enabled`. |
| `cannot load certificate ... pokerprobe.com.crt` | Copy certs or reuse paths from your working `daid.pokerprobe.com` file. |
| `duplicate listen ... default_server` | Remove `default_server` from one site or disable duplicate 443 listener. |
| `unknown directive` | Windows line endings — run `sudo sed -i 's/\r$//' /etc/nginx/sites-available/FILENAME` |

### Safe deploy on your box (Myrtille only, like daid)

```bash
cd /etc/nginx/sites-available

# If you enabled a broken full pokerprobe config, disable it first:
sudo rm -f /etc/nginx/sites-enabled/pokerprobe

# Slug file only (replace SLUG with grlnofp8):
sudo nano grlnofp8.pokerprobe.com
# paste from docs/nginx-slug.example.conf, replace SLUG → grlnofp8

sudo ln -sf /etc/nginx/sites-available/grlnofp8.pokerprobe.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If `nginx -t` still fails, paste the full output:

```bash
sudo nginx -t 2>&1
sudo journalctl -xeu nginx.service --no-pager | tail -20
```

## nginx restart / config test failed

### Step 1 — get the exact error

```bash
sudo nginx -t 2>&1
```

### Step 2 — is Myrtille.conf the problem?

```bash
sudo rm -f /etc/nginx/sites-enabled/Myrtille.conf
sudo nginx -t
```

| Result | Meaning |
|--------|---------|
| `test is successful` | Problem is **inside** Myrtille.conf (or a duplicate of the same host elsewhere) |
| Still fails | Another enabled site is broken — not Myrtille |

Re-enable after fixing:

```bash
sudo ln -sf /etc/nginx/sites-available/Myrtille.conf /etc/nginx/sites-enabled/
```

### Step 3 — replace with known-good minimal config

From the repo (or paste `docs/Myrtille.conf`):

```bash
sudo cp /path/to/PokerProbe/docs/Myrtille.conf /etc/nginx/sites-available/Myrtille.conf
sudo sed -i 's/\r$//' /etc/nginx/sites-available/Myrtille.conf
```

Copy **SSL paths from your working daid site** if cert error:

```bash
grep ssl_certificate /etc/nginx/sites-available/daid.pokerprobe.com
sudo nano /etc/nginx/sites-available/Myrtille.conf
```

### Step 4 — duplicate server_name

```bash
sudo grep -r "grlnofp8.pokerprobe.com" /etc/nginx/sites-enabled/
```

Only **one** file should define that hostname. Remove extras:

```bash
sudo rm -f /etc/nginx/sites-enabled/grlnofp8.pokerprobe.com
sudo rm -f /etc/nginx/sites-enabled/pokerprobe-desktop
```

### Step 5 — test and reload

```bash
sudo ln -sf /etc/nginx/sites-available/Myrtille.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -sI -H "Host: grlnofp8.pokerprobe.com" https://127.0.0.1/myrtille -k
```

### Common errors

| Message | Fix |
|---------|-----|
| `conflicting server name` | Only one enabled file for `grlnofp8.pokerprobe.com` |
| `cannot load certificate` | Match paths to `daid.pokerprobe.com` |
| `duplicate zone "SSL"` | Remove `ssl_session_cache shared:SSL` from Myrtille.conf |
| `unknown directive` | `sudo sed -i 's/\r$//' /etc/nginx/sites-available/Myrtille.conf` |
| Redirect to `http://10.80.30.139/myrtille` in browser | Use `Host $host` not `Host 10.80.30.139`; add `proxy_redirect` lines |

## Checklist

- [ ] `curl -H Host:grlnofp8... http://127.0.0.1/myrtille` → Myrtille, not connorking
- [ ] `curl http://10.80.30.139/myrtille` → Myrtille on Win11
- [ ] Orange cloud on DNS A record
- [ ] Router **443 → nginx** (not 8787 → Win11)
- [ ] Firestore `guacamoleUrl` has no `:8787` port

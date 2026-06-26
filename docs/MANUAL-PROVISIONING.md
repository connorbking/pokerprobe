# Manual Server Provisioning (Firestore)

PokerProbe stores **all customer server records in Firestore**. There is no JSON file to edit or redeploy.

After a customer subscribes, the Stripe webhook creates a `servers/{serverId}` document with `status: "pending"`. Operators update that same record when infrastructure is ready — the customer dashboard reads it live via `/api/servers`.

## Data model

Collection: **`servers`**

| Field | Description |
|-------|-------------|
| `id` | e.g. `srv_abc123` |
| `userId` / `userEmail` | Firebase user |
| `plan` | `starter` \| `pro` \| `elite` |
| `status` | `pending` → `provisioning` → `active` (or `suspended` / `terminated`) |
| `userSlug` | Owner namespace from email local-part, e.g. `jsmith` (unique; duplicates get `-2`, `-3`, …) |
| `serverSlug` | Unique 8-char DNS label, e.g. `k7m2p9xq` → `k7m2p9xq.pokerprobe.com` |
| `hostname` | Same as `serverSlug` (flat subdomain) |
| `guacamoleUrl` | Myrtille desktop URL, e.g. `https://k7m2p9xq.pokerprobe.com/myrtille` |
| `username` | Optional; SFTP/RDP username if needed |
| `ip` | Internal/private IP (ops only; not shown as primary UX) |
| `hetznerServerId` | Infrastructure ID |
| `provisionTags` | Sim install tags (set automatically at checkout) |
| `installedSims` | e.g. `["flopzilla", "piosolver"]` |
| `provisionedAt` | ISO timestamp when marked `active` |
| `label` | Customer-visible server name |

Collection: **`users`** — one doc per Firebase uid (`userSlug`, `isAdmin`, `stripeCustomerId`, etc.)

| Field | Description |
|-------|-------------|
| `userSlug` | Assigned on **first sign-in** from email local-part (e.g. `jsmith`); duplicates get `-2`, `-3`, … |

View data: [Firebase Console → Firestore](https://console.firebase.google.com/project/pokerprobe-4c8f3/firestore)

## Workflow

### 1. New subscription

When Stripe fires `checkout.session.completed`:

- A Firestore server record is created automatically (`status: "pending"` initially)
- If **`PROVISION_DNS_ENABLED=true`**, Cloudflare DNS + `guacamoleUrl` + `active` are applied automatically — see [AUTO-PROVISIONING.md](./AUTO-PROVISIONING.md)
- Check **Cloudflare Workers → pokerprobe → Logs** for `[PROVISIONING NEEDED]` / `[AUTO PROVISION]`
- Or list pending servers (see CLI below)

The customer sees the server tile immediately with placeholder stats.

### 2. Provision infrastructure

1. Create the Windows Server (Hetzner) matching the plan SKU
2. Register DNS: `{serverSlug}.pokerprobe.com` → server IP (or Cloudflare Tunnel)
3. Install sims per `provisionTags` on the server record

### 3. Activate in Firestore (no redeploy)

From the project root with `.env.local` configured:

```bash
# List servers awaiting setup
npm run server-admin -- list --status pending

# Inspect a record
npm run server-admin -- get srv_abc123

# Mark provisioning in progress (optional)
npm run server-admin -- update srv_abc123 --status provisioning --notes "Hetzner VM created"

# Go live — hostname + Myrtille URL auto-filled from slugs if omitted
npm run server-admin -- activate srv_abc123 \
  --username Administrator \
  --installed-sims flopzilla,piosolver,hrc
```

`activate` sets `status: "active"` and `provisionedAt` automatically.

### 4. Pending / in progress

While `pending` or `provisioning`, the dashboard shows red status and placeholder metrics. No deploy required when you change status.

### 5. Cancellation

`customer.subscription.deleted` webhook sets server `status: "terminated"` automatically.

To suspend for billing issues, Stripe `customer.subscription.updated` sets `suspended`. Decommission VPS manually and optionally:

```bash
npm run server-admin -- update srv_abc123 --status terminated --notes "Decommissioned 2026-06-25"
```

## Health check

```bash
curl https://www.pokerprobe.com/api/health/storage
```

Both `hasProjectId` and `hasServiceAccount` must be `true`.

## Stripe webhook

In Stripe Dashboard → Webhooks:

```
https://www.pokerprobe.com/api/webhooks/stripe
```

Events:

- `checkout.session.completed` — creates Firestore server
- `customer.subscription.updated` — active / suspended
- `customer.subscription.deleted` — terminated

Set `STRIPE_WEBHOOK_SECRET` in Cloudflare Worker secrets.

## Operator scripts

| Script | Purpose |
|--------|---------|
| `npm run server-admin -- list` | List all servers |
| `npm run server-admin -- get <id>` | Full server JSON |
| `npm run server-admin -- activate <id> ...` | Mark server Online |
| `npm run set-admin <email>` | Grant Firestore `isAdmin` |
| `npm run test-firestore` | Verify Firestore connectivity |

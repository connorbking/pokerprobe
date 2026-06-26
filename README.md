# PokerProbe

Dedicated 24/7 server infrastructure for poker simulation workloads — [www.pokerprobe.com](https://www.pokerprobe.com).

## Stack

- **Next.js 15** (App Router) on **Cloudflare Workers** via OpenNext
- **Tailwind CSS 4** — poker-themed dark/felt styling
- **Firebase Auth** — Google and email/password sign-in
- **Stripe** — subscription checkout & customer billing portal
- **Firestore** — server records, users, permissions (see [docs/MANUAL-PROVISIONING.md](docs/MANUAL-PROVISIONING.md))

## Local Development

```bash
npm install
cp .env.example .env.local
# Add Firebase + Stripe keys — see docs/FIREBASE-SETUP.md
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Cloudflare

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/) with `pokerprobe.com` added
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) authenticated: `npx wrangler login`

### First deploy

```bash
npm run deploy
```

This builds with OpenNext and deploys the Worker to Cloudflare.

### Custom domain

1. In **Cloudflare Dashboard → Workers & Pages → pokerprobe → Settings → Domains & Routes**
2. Add custom domain: `www.pokerprobe.com` (and optionally `pokerprobe.com`)
3. Ensure DNS for `pokerprobe.com` is on Cloudflare nameservers

### Environment variables

Set these in **Workers → pokerprobe → Settings → Variables and secrets** (runtime):

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_*` | All Firebase web config values |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `FIREBASE_PROJECT_ID` | `pokerprobe-4c8f3` |
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | Firestore service account (Secret) |
| `STRIPE_SECRET_KEY` | Secret |
| `STRIPE_WEBHOOK_SECRET` | Secret |

Stripe price IDs for Study/Solver/Farm are hardcoded in the repo. Verify config: `/api/health/config`, `/api/health/stripe`, `/api/health/storage`.

See **[docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md)** for Firebase provider configuration.

### CI/CD (Cloudflare Workers Builds)

Connect your Git repo under **Workers & Pages → pokerprobe → Settings → Build**.

**Important:** This app uses OpenNext — `next build` alone does **not** produce the CSS/JS static assets. You must run `opennextjs-cloudflare build` before deploy.

| Setting | Value |
|--------|--------|
| **Build command** | `npm ci && npm run cf:build` |
| **Deploy command** | `npx wrangler deploy --keep-vars` |
| **Root directory** | `/` |

Do **not** use `npm run build` as the build command. Do **not** use a Pages project or a “Build output directory” — this is a **Worker** with an assets binding (see `wrangler.jsonc`).

If styles break after a secret-only update, retry a full deploy (Build → Redeploy) so static assets are re-uploaded with the Worker.

### CI/CD (single-step alternative)

| Setting | Value |
|--------|--------|
| **Build command** | *(leave empty)* |
| **Deploy command** | `npm ci && npm run deploy` |

### Preview locally in Workers runtime

```bash
npm run preview
```

## Firebase Setup

See **[docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md)** — enable Google and Email/Password in Firebase Console.

## Stripe Setup

1. In your **King eCommerce** Stripe test account, copy the secret and publishable keys into `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
2. Create the three subscription products (Study $329, Solver $549, Farm $999):
   ```bash
   npm run setup-stripe
   ```
   This writes `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, and `STRIPE_PRICE_ELITE` to `.env.local`.
3. Enable [Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
4. Add webhook endpoint: `https://www.pokerprobe.com/api/webhooks/stripe`
5. Local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

Checkout is **embedded** on `/dashboard/checkout/[planId]` — customers stay on pokerprobe.com.

## Manual Server Provisioning

See **[docs/MANUAL-PROVISIONING.md](docs/MANUAL-PROVISIONING.md)** for the operator workflow.

Server records live in **Firestore** (`servers` collection). Use `npm run server-admin` to list, inspect, and activate servers after checkout — no JSON files or redeploy needed for data updates.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signin` | Sign in |
| `/dashboard` | Subscription & server status |
| `/dashboard/plans` | Choose a plan |
| `/dashboard/checkout/[planId]` | Embedded Stripe checkout |
| `/terms`, `/privacy`, `/sla`, etc. | Legal pages |

# PokerProbe

Dedicated 24/7 server infrastructure for poker simulation workloads — [www.pokerprobe.com](https://www.pokerprobe.com).

## Stack

- **Next.js 15** (App Router) on **Cloudflare Workers** via OpenNext
- **Tailwind CSS 4** — poker-themed dark/felt styling
- **Firebase Auth** — Google and email/password sign-in
- **Stripe** — subscription checkout & customer billing portal
- **Manual provisioning** — servers are set up by hand (see [docs/MANUAL-PROVISIONING.md](docs/MANUAL-PROVISIONING.md))

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

Set these in **Workers → pokerprobe → Settings → Variables and Secrets**:

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_*` | All 6 Firebase web config values |
| `STRIPE_SECRET_KEY` | Restricted key recommended |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook config |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key |
| `STRIPE_PRICE_STARTER` | Stripe price ID |
| `STRIPE_PRICE_PRO` | Stripe price ID |
| `STRIPE_PRICE_ELITE` | Stripe price ID |

See **[docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md)** for Firebase provider configuration.

### CI/CD (optional)

Connect your Git repo in **Workers & Pages → Create → Connect to Git**:

- **Build command:** `npm run deploy` or `opennextjs-cloudflare build && opennextjs-cloudflare deploy`
- **Root directory:** `/`

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

Customer server records live in `src/data/customer-servers.json`. Edit, commit, and redeploy after provisioning each server.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signin` | Sign in |
| `/dashboard` | Subscription & server status |
| `/dashboard/plans` | Choose a plan |
| `/dashboard/checkout/[planId]` | Embedded Stripe checkout |
| `/terms`, `/privacy`, `/sla`, etc. | Legal pages |

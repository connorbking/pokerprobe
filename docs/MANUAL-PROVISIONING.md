# Manual Server Provisioning

PokerProbe does **not** auto-provision servers. After a customer subscribes, you set up each dedicated server by hand.

## Workflow

### 1. New subscription

When Stripe fires `checkout.session.completed`:

- Check **Stripe Dashboard → Customers** for the new subscriber
- Or review **Cloudflare Workers → pokerprobe → Logs** for `[MANUAL PROVISIONING]` entries

### 2. Provision the server

1. Spin up a Windows Server VPS matching their plan (Starter / Pro / Elite)
2. Install RDP, .NET runtimes, and any baseline tools
3. Send RDP credentials to the customer's email (password **never** goes in the repo)

### 3. Register the server in the dashboard

Edit `src/data/customer-servers.json` (one customer can have multiple servers):

```json
{
  "customer@example.com": [
    {
      "id": "server-1",
      "label": "Primary solver box",
      "status": "active",
      "host": "123.45.67.89",
      "username": "Administrator",
      "plan": "Pro",
      "provisionedAt": "2025-06-25"
    }
  ]
}
```

For a second server on the same account, append to the array:

```json
{
  "customer@example.com": [
    { "id": "server-1", "status": "active", "host": "123.45.67.89", "plan": "Pro", "provisionedAt": "2025-06-25" },
    { "id": "server-2", "status": "pending", "plan": "Starter", "notes": "Second server — provisioning" }
  ]
}
```

Redeploy to Cloudflare:

```bash
npm run deploy
```

The customer will see host/username in their dashboard. Password stays in the email you sent.

### 4. Pending state

If you've received payment but haven't finished setup yet:

```json
{
  "customer@example.com": {
    "status": "pending",
    "plan": "Pro",
    "notes": "VPS ordered, awaiting IP"
  }
}
```

### 5. Cancellation

When a subscription is canceled (`customer.subscription.deleted`):

1. Suspend or decommission the VPS
2. Update or remove their entry in `customer-servers.json`:

```json
{
  "customer@example.com": {
    "status": "suspended",
    "notes": "Canceled 2025-06-25"
  }
}
```

3. Redeploy

## Stripe webhook on Cloudflare

In Stripe Dashboard → Webhooks, add:

```
https://www.pokerprobe.com/api/webhooks/stripe
```

Events to listen for:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Set `STRIPE_WEBHOOK_SECRET` in Cloudflare Worker variables.

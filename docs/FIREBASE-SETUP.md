# Firebase Authentication Setup

PokerProbe uses **Firebase Auth** for Google and email/password sign-in.

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (e.g. `pokerprobe-4c8f3`)
3. Add a **Web app** — register `www.pokerprobe.com`
4. Copy the config object into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=www.pokerprobe.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Set the same variables in **Cloudflare Workers → Build → Build variables** (required for `NEXT_PUBLIC_*`) and **Variables and Secrets** for production.

## 2. Firestore (server storage — dashboard & webhooks)

The dashboard reads server records from Firestore. This uses a **service account**, separate from client login.

### Local (`.env.local`)

```
FIREBASE_PROJECT_ID=pokerprobe-4c8f3
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Paste the Firebase service account JSON as **one line**. Download from Firebase Console → Project settings → Service accounts → Generate new private key.

### Cloudflare (runtime — fixes “Server storage is not configured”)

In **Workers → pokerprobe → Settings → Variables and Secrets** (runtime, **not** Build variables):

| Name | Type | Value |
|------|------|--------|
| `FIREBASE_PROJECT_ID` | Variable | `pokerprobe-4c8f3` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Secret | Full JSON minified to **one line** |

**Or** (easier if Cloudflare truncates multiline secrets):

| Name | Type | Value |
|------|------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | Secret | Run `node scripts/encode-service-account.mjs path/to/key.json` and paste the output |

After saving secrets, reload `/dashboard`. Check status at `/api/health/storage` — both `hasProjectId` and `hasServiceAccount` should be `true`.

## 3. Custom auth domain (`www.pokerprobe.com`)

The app runs on **Cloudflare Workers**, not Firebase Hosting. Firebase OAuth still needs `https://<authDomain>/__/auth/handler` to resolve. **`next.config.ts` rewrites** proxy `/__/auth/*` and `/__/firebase/init.json` to `https://<project>.firebaseapp.com` on whatever hostname serves this Worker.

**`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` must exactly match the hostname in the handler URL.**

| If auth domain is | Handler URL (must return Firebase auth page, not 404) |
|-------------------|--------------------------------------------------------|
| `www.pokerprobe.com` | `https://www.pokerprobe.com/__/auth/handler` |
| `pokerprobe.com` | `https://pokerprobe.com/__/auth/handler` |

Use **`www.pokerprobe.com`** if that is your custom auth domain. If you connected the **apex** domain in Firebase Hosting instead, set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pokerprobe.com` and ensure `pokerprobe.com` routes to this Worker (not only `www`).

After deploy, open the handler URL in a browser — you should see a Firebase auth page (not a 404). A message about “missing initial state” is normal when visiting directly.

### Google Cloud OAuth (required for Google sign-in)

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → your **Web client** (Firebase auto-created):

- **Authorized JavaScript origins:** `https://www.pokerprobe.com`, `https://pokerprobe.com`, `http://localhost:3000`
- **Authorized redirect URIs:** `https://www.pokerprobe.com/__/auth/handler` (and `https://pokerprobe.com/__/auth/handler` if using apex as auth domain)

Redeploy after changing `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` so the client bundle picks it up.

## 4. Enable sign-in providers

In Firebase Console → **Authentication → Sign-in method**:

### Email/Password
- Enable **Email/Password**

### Google
- Enable **Google**
- Firebase handles OAuth — update redirect URIs in Google Cloud as above

## 5. Authorized domains

Firebase Console → Authentication → Settings → **Authorized domains**

Add:
- `localhost` (dev)
- `pokerprobe.com`
- `www.pokerprobe.com`

## 6. How it works in this app

1. User signs in via Firebase (Google popup or email form)
2. OAuth redirects through `https://<authDomain>/__/auth/handler` (proxied to Firebase Hosting)
3. Client gets a Firebase ID token and POSTs it to `/api/auth/session`
4. Server verifies the token (edge-compatible, no firebase-admin) and sets an httpOnly cookie
5. Protected routes (`/dashboard`, Stripe APIs) read and verify that cookie

## 7. Local development

For local dev, use the default Firebase hosting domain in `.env.local` so OAuth does not redirect to production:

```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pokerprobe-4c8f3.firebaseapp.com
```

Add credentials, then:

```bash
npm run dev
```

Visit `/signin` to test Google and email sign-in.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `auth/unauthorized-domain` | Add your domain in Firebase authorized domains |
| 404 on `/__/auth/handler` | Redeploy Worker; ensure custom domain routes to this Worker |
| Google `redirect_uri_mismatch` | Add `https://<authDomain>/__/auth/handler` in Google Cloud redirect URIs |
| Google popup fails | Ensure Google provider is enabled in Firebase |
| "Firebase not configured" | Fill all `NEXT_PUBLIC_FIREBASE_*` in Cloudflare **Build variables** and redeploy |
| Sign-in works but dashboard redirects | Check browser cookies; ensure `/api/auth/session` returns 200 |

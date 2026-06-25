# Firebase Authentication Setup

PokerProbe uses **Firebase Auth** for Google and email/password sign-in.

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (e.g. `pokerprobe-4c8f3`)
3. Add a **Web app** — register `www.pokerprobe.com`
4. Copy the config object into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Set the same variables in **Cloudflare Workers → Variables** for production.

## 2. Enable sign-in providers

In Firebase Console → **Authentication → Sign-in method**:

### Email/Password
- Enable **Email/Password**

### Google
- Enable **Google**
- Firebase handles OAuth — no separate Google Cloud setup needed for basic use
- Add authorized domain: `pokerprobe.com` and `localhost`

## 3. Authorized domains

Firebase Console → Authentication → Settings → **Authorized domains**

Add:
- `localhost` (dev)
- `pokerprobe.com`
- `www.pokerprobe.com`

## 4. How it works in this app

1. User signs in via Firebase (Google popup or email form)
2. Client gets a Firebase ID token and POSTs it to `/api/auth/session`
3. Server verifies the token (edge-compatible, no firebase-admin) and sets an httpOnly cookie
4. Protected routes (`/dashboard`, Stripe APIs) read and verify that cookie

## 5. Local development

Add credentials to `.env.local`, then:

```bash
npm run dev
```

Visit `/signin` to test Google and email sign-in.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `auth/unauthorized-domain` | Add your domain in Firebase authorized domains |
| Google popup fails | Ensure Google provider is enabled in Firebase |
| "Firebase not configured" | Fill all `NEXT_PUBLIC_FIREBASE_*` env vars |
| Sign-in works but dashboard redirects | Check browser cookies; ensure `/api/auth/session` returns 200 |

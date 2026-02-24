# Viral Sync App (Next.js + Capacitor)

Mobile-first merchant + consumer frontend for the Viral Sync protocol.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth modes

The app supports two auth modes:

1. Firebase Google sign-in (recommended)
2. Demo wallet fallback (works with zero backend)

If Firebase env vars are missing, the UI automatically falls back to demo auth.

## Firebase setup (free tier)

1. Create a Firebase project (Spark/free plan).
2. Enable **Authentication > Sign-in method > Google**.
3. Add your web origin(s) to authorized domains.
4. Copy credentials into `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
```

For Android/Capacitor builds, use redirect auth and make sure the hosted domain used by the app is also authorized in Firebase.

## Build checks

```bash
npm run lint
npm run build
```

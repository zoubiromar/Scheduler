# Stack

## Client

- Vite, React, and TypeScript
- React Router with hash routes while deployed to GitHub Pages
- Plain responsive CSS
- Installable PWA via `vite-plugin-pwa`
- Vitest for domain/repository tests

The route layer is isolated so a later Vercel deployment can switch to clean
browser routes without changing product screens.

## Backend

Supabase provides:

- Auth with Google OAuth and email magic links
- Postgres normalized around partnerships and schedule rows
- Row Level Security for member, owner, and privacy rules
- Realtime `postgres_changes` subscriptions
- secure SQL functions for partnership creation and invitation lifecycle

Environment variables are public client credentials:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

All authorization remains in RLS; the anon key is safe to embed when policies
are enabled. Service-role credentials must never enter the client.

## Offline and migration

The PWA shell still opens offline. Demo/local state remains in `dayline.v2`.
Authenticated cloud schedules use optimistic local state, reconnect refresh,
and row-level realtime updates. Existing local data is imported explicitly as
private or shared; it is never uploaded silently.

## Later integrations

- Apple Sign-In before a native App Store release
- Resend or a similar provider for sending invite emails
- Google Calendar read-only before two-way sync
- Vercel for clean routes and preview environments
- Stripe only after a paid couple feature proves demand

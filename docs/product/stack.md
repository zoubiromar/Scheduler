# Stack (locked)

## Platform

**Web app + PWA first.** Installable on a phone home screen. Native wrappers only after daily retention is proven.

Why not native-first: booking is a URL; Google OAuth is simpler on web; day/week layouts are easier on a large viewport; one codebase.

## Frontend

- **Vite + React + TypeScript**
- Plain CSS (no design-system lock-in)
- PWA via `vite-plugin-pwa` (offline shell; checklist completions queued locally)

Why Vite over Next.js for v1: the product is an authenticated SPA with a public booking route, not an SEO content site. File-based routing can move to Next.js later if marketing pages need it.

## Persistence (v1 slice)

- **localStorage** JSON document (`dayline.v1`) so the Today view works without a backend.
- Shape matches the data model so a later API can replace the storage adapter.

## Backend (next, not this slice)

**Supabase** (Postgres + Auth + Row Level Security + optional Realtime).

Why not custom Node + Postgres yet: auth, Google OAuth, and hosted Postgres are the slow parts; we do not have multi-tenant business logic that would require a custom API first.

Why not Firebase: we want relational entities (routines, occurrences, bookings) and SQL for availability queries.

## Later integrations

| Need | Choice |
| --- | --- |
| Identity | Supabase Auth: Google + email |
| Calendar | Google Calendar API, read-only then two-way |
| Mail | Transactional provider (Resend or similar) for booking confirmations |
| Hosting | Vercel (app) + Supabase (data) |
| Payments | Stripe Checkout for Pro |

## Recurrence

In-house engine in `src/lib/recurrence.ts` (tested). No RRULE library until we need iCal export compatibility.

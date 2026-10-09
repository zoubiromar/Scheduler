# Dayline Duo

Dayline is a two-person scheduling PWA. Each partner keeps personal or private
items, while shared tasks appear once across mirrored Today and Week views.

## Run locally

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

Without Supabase values, use **Explore demo** from the landing page.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` in timestamp order.
3. Enable Google in **Authentication → Providers** and configure its OAuth
   credentials. Email magic links use the Email provider.
4. Add these redirect URLs:
   - `http://localhost:5173/`
   - `https://zoubiromar.github.io/Scheduler/`
5. Copy the project URL and public anon key into `.env.local`.

The schema enforces a maximum of two members, one admin, private-item isolation,
shared-item editing, per-user completion, and expiring partner invitations via
Row Level Security and security-definer functions.

## Build and deploy

```bash
BASE_PATH=/Scheduler npm run build
```

`.github/workflows/deploy.yml` publishes `main` to GitHub Pages. Hash-based
routes keep landing, auth, invites, and protected app screens compatible with
static hosting. Supabase remains the cloud source of truth.

## Included

- Google OAuth and email magic-link auth boundary
- solo onboarding and two-person partnership invitations
- realtime Supabase schedule repository with offline/reconnect states
- personal, partner-visible, private, and shared items
- assigned/either/both completion modes
- mirrored Today view and three-lane 7 AM–midnight Week view
- account, partnership, admin, defaults, privacy, import, and demo settings
- tested recurrence, occurrence overrides, and duo completion rules

Apple Sign-In, calendar integrations, expenses, date ideas, shared goals, and
other couple modules remain planned extensions.

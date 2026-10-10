# Pellia Duo

Pellia is a two-person scheduling PWA. Each partner keeps personal or private
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
5. Copy the project URL and publishable key into `.env.local`.

For GitHub Pages, add the same two values as repository Actions secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The secret key must stay in Supabase and must not be added to the frontend.

The schema enforces a maximum of two members, one admin, private-item isolation,
shared-item editing, per-user completion, and expiring partner invitations via
Row Level Security and security-definer functions.

## Invitation email delivery

Pellia discovers invitations by the signed-in user's email, so recipients see
an in-app banner even when they create an account without opening the email
link. The `send-partner-invite` Edge Function creates and emails the invitation.

Configure these Edge Function secrets in Supabase:

```text
APP_URL=https://zoubiromar.github.io/Scheduler/
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Pellia <invites@your-verified-domain.com>
```

Deploy with:

```bash
supabase functions deploy send-partner-invite --project-ref <project-ref> --use-api
```

Without a Resend key, invite links still work and the UI gives the admin a
copy-link fallback instead of claiming an email was sent.

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

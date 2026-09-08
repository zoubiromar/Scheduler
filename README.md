# Dayline (codename: scheduler)

Personal scheduling app: recurring routines, a daily checklist, timed events, and (later) one booking link.

This slice is the **Today view PWA** with local persistence and a tested recurrence engine. Product decisions live in [`docs/product/README.md`](docs/product/README.md).

## Run

```bash
npm install
npm test
npm run dev
```

Open the paper prototype at [`prototype/today.html`](prototype/today.html) for interviews.

## Hosting

Pushing to `main` builds and publishes to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which enables Pages on first run. The site is then served from `https://<user>.github.io/<repo>/`.

Pages serves the app from a subdirectory, so CI passes the repo path as `BASE_PATH` and `vite.config.ts` normalizes it into Vite's `base`. To reproduce a production build locally:

```bash
BASE_PATH=/Scheduler npm run build
```

Because it ships as a PWA, the hosted URL can be installed to a phone home screen ("Add to Home Screen") and opens without browser chrome.

**Data is per-device.** State lives in `localStorage`, so installing on a phone and a laptop gives two separate schedules. Cross-device sync arrives with the Supabase backend (see [`docs/product/stack.md`](docs/product/stack.md)).

When the public booking route (`/book/:slug`) lands, static hosting will also need an SPA fallback (`404.html`) since Pages has no server-side rewrites.

## What this repo includes

- Interactive Today / Week views with seed routines, checklist, and timed events
- Recurrence (`daily`, `weekly` weekdays, interval, `exdates`, `count`)
- Availability helper for the future booking page
- PWA manifest (installable)

Google Calendar two-way sync is explicitly out of MVP.

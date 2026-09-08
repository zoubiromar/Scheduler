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

## What this repo includes

- Interactive Today / Week views with seed routines, checklist, and timed events
- Recurrence (`daily`, `weekly` weekdays, interval, `exdates`, `count`)
- Availability helper for the future booking page
- PWA manifest (installable)

Google Calendar two-way sync is explicitly out of MVP.

# MVP scope (locked)

Dayline v1 is for **individuals managing personal life**, not teams or sales pipelines.

## In scope

| Surface | Behavior |
| --- | --- |
| **Today view** | Home screen. Recurring routines, untimed daily checklist, timed events, completion. |
| **Recurrence** | Daily, weekly, custom weekdays. Optional start/end. Time optional (untimed → checklist-like routine). |
| **Manual events** | One-off timed items on a day/week calendar. |
| **Single booking link** | One public page (`/book/:slug`) with weekly availability, buffer, min notice. Guest picks a free slot; host gets a confirmation (email in production; in-app + local record in this slice). |
| **Local persistence** | Completions and edits survive refresh on the same device. |

## Explicitly out of scope (this MVP)

- Google Calendar **two-way** sync (conflicts, duplicates, write-back).
- Google Calendar **import** (Phase 2, read-only).
- Apple Calendar, Outlook, Zoom, payments on booking.
- Multiple booking pages, custom branding, analytics.
- Team workspaces, couple calendars, AI auto-schedule.
- Habitica-style RPG gamification (streaks only, later).
- Native iOS/Android apps.

`.ics` export is optional and not required to ship the Today view.

## Success metric

A user opens Dayline on **7 consecutive days**, and in the same session **completes at least one checklist item** and **views timed events**.

## Build slices

1. **This repo slice:** scaffold, Today view, seed data, local persistence, recurrence engine + tests.
2. **After user tests:** booking confirmations and email.
3. **Phase 2:** read-only Google Calendar import.
4. **Phase 3:** two-way Google Calendar with visible source labels and conflict UI.

# Data model

All times are stored as local civil dates (`YYYY-MM-DD`) plus optional `HH:mm`. Recurrence is evaluated in the user's local timezone.

## Entities

### User

Owner of all other records. In this slice there is a single implicit local user.

### RecurrenceRule

| Field | Meaning |
| --- | --- |
| `frequency` | `daily` or `weekly` |
| `interval` | Every N days or N weeks |
| `byWeekday` | `0–6` (Sun–Sat). Required for weekly; ignored for daily |
| `startDate` | Inclusive |
| `endDate` | Optional inclusive |
| `count` | Optional max occurrences |
| `exdates` | Dates to skip |

A date **occurs** if it is on-or-after `startDate`, not excluded, within `endDate`/`count`, and matches the frequency (day-of-week + week interval, or day interval).

### Routine

A repeating personal pattern. **Time is optional.**

- With `startTime` + `durationMinutes` → shows on the calendar as generated occurrences.
- Without time → shows in the Today **routines** list (habit-like), not on the hour grid.

Routines do not copy rows per day. Completions are stored as `RoutineCompletion { routineId, date }`.

### Event

A concrete timed (or all-day) instance: manual, booking, or (later) Google-imported.

| Field | Meaning |
| --- | --- |
| `source` | `manual` \| `booking` \| `google` |
| `date`, `startTime`, `durationMinutes` | When it occupies the grid |
| `title` | Display name |

### ChecklistTemplate + ChecklistItem

Untimed, repeatable work that is **not** a clock block. The template lists items; each calendar day gets a `DailyChecklist` instance with per-item `done` flags.

Reset policy: `daily` (this MVP). Weekly reset can be added without changing item identity.

Optional `carryOver`: incomplete items appear the next day until checked.

### Goal

A longer horizon (e.g. quarter). Not shown as a timed block. Optional `linkedRoutineIds` for progress (“gym routine completed N times”).

### BookingPage

One per user in MVP.

| Field | Meaning |
| --- | --- |
| `slug` | Public path `/book/:slug` |
| `title` | Guest-facing name (“Coffee with Alex”) |
| `durationMinutes` | Slot length |
| `bufferMinutes` | Padding around existing busy times |
| `minNoticeHours` | Cannot book sooner than this |
| `weeklyHours` | Per weekday start/end windows |
| `maxPerDay` | Cap incoming bookings |

### Booking

Guest request that **creates an Event** (`source: booking`) when confirmed.

## Relationships

```
User
  ├── Routine ── RecurrenceRule
  ├── RoutineCompletion
  ├── Event
  ├── ChecklistTemplate ── ChecklistItem
  ├── DailyChecklist (per date)
  ├── Goal
  └── BookingPage ── Booking ── Event
```

## Busy time (for booking)

Busy = timed routine occurrences on that date ∪ events on that date. Free slots = `weeklyHours` minus busy ranges minus buffers, snapped to `durationMinutes`.

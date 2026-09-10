# Data model

All times are stored as local civil dates (`YYYY-MM-DD`) plus optional `HH:mm`. Recurrence is evaluated in the user's local timezone.

## Entities

### User

Owner of all other records. In this slice there is a single implicit local user.

### Recurrence

| Field | Meaning |
| --- | --- |
| `kind` | `weekdays` or `cycle` |
| `days` | Calendar weekdays `0–6` for `weekdays` |
| `length` / `active` | Loop length and selected zero-based positions for `cycle` |
| `startDate` | Inclusive |
| `endDate` | Optional inclusive |
| `exdates` | Dates to skip |

A cycle is anchored on `startDate`: day 1 is position `0`. A 6-day loop
on days 1, 4, and 5 stores `active: [0, 3, 4]`.

### RepeatingTask

A repeating personal pattern with an optional time and user tags.

- With `startTime` + `durationMinutes` → shows on the calendar as generated occurrences.
- Without time → shows in the Today **routines** list (habit-like), not on the hour grid.

Tasks do not copy rows per day. Completions are stored as
`TaskCompletion { taskId, date }`.

### TaskOccurrenceOverride

A single generated occurrence can diverge without mutating its series. The
override stores `taskId`, stable `originalDate`, current `date`, and a complete
snapshot of title, notes, optional time/duration, and tags. `cancelled` removes
only that occurrence. Moving one suppresses the original date and renders the
snapshot on its destination date. Removing the parent series also removes its
overrides.

### Event

A concrete timed (or all-day) instance: manual, booking, or (later) Google-imported.

| Field | Meaning |
| --- | --- |
| `source` | Internal origin (`manual`, `booking`, `google`); not displayed as a category |
| `date`, optional `startTime` / `durationMinutes` | Timed events occupy the grid; untimed events join Anytime |
| `title` | Display name |
| `tagIds` | User-created visible grouping |

### Tag

`{ id, name, color }`. Repeating tasks and one-off events can have multiple
tags. Deleting a tag removes its id from items, never the items themselves.

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
  ├── RepeatingTask ── Recurrence
  ├── TaskCompletion
  ├── Event
  ├── Tag
  ├── Goal
  └── BookingPage ── Booking ── Event
```

## Busy time (for booking)

Busy = timed repeating-task occurrences on that date ∪ events on that date.
Free slots = `weeklyHours` minus busy ranges minus buffers, snapped to
`durationMinutes`.

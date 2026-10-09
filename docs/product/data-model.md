# Duo data model

Supabase Postgres is the source of truth. Local `dayline.v2` data can be
imported once after account creation.

## Identity and partnership

- `profiles`: Supabase Auth user, name, avatar, and IANA timezone.
- `partnerships`: one two-person space with one admin.
- `partnership_members`: admin/partner role and UI accent color; each user can
  belong to one partnership in the MVP.
- `partnership_invites`: hashed, expiring, revocable invite tokens.
- `user_preferences`: week start, default scope/visibility/completion, and day
  timeline start.

## Schedule

`schedule_items` unifies repeating tasks and one-time events:

- `kind`: `task` or `event`.
- `scope`: `personal` or `shared`.
- `visibility`: `private` or `partner_visible`; shared is always visible.
- `completion_rule`: `assigned`, `either`, or `both`.
- civil date/time fields plus `anchor_timezone`.
- a recurrence JSON object for tasks or a concrete date for events.

Supporting tables:

- `schedule_item_assignees`
- `tags` and `schedule_item_tags`
- `occurrence_overrides`
- `occurrence_completions` keyed by item, original occurrence date, and user

## Authorization

Row Level Security enforces the product rules:

- partnership members can read shared and partner-visible items;
- only the creator reads private personal items;
- members update their own personal items;
- either member updates shared items;
- completion rows can only be added or removed for the signed-in user;
- partnership admin policies never bypass private schedule policies.

## Recurrence and timezones

Recurrence remains a civil-date rule:

- `weekdays`: selected weekdays with start/end/exceptions;
- `cycle`: selected positions in an N-day cycle anchored on its start date.

The item stores the timezone in which the rule was created. Each member's Today
is evaluated in their profile timezone, while partner-local display text can be
derived without changing the recurrence anchor.

## Future modules

Expenses, shared goals, date ideas, visit countdowns, and check-ins use the same
`partnership_id` tenancy boundary and receive their own tables rather than
overloading schedule items.

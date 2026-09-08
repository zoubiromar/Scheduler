# Five persona walkthroughs (prototype stress test)

These are **design walkthroughs**, not substitutes for live interviews. Run the protocol in `interview-protocol.md` with real people next; replace this file with quotes.

Prototype: `prototype/today.html` and the in-app Today view.

## 1. Maya — new parent

- Needs: repeating wake/feed windows, a short untimed list (bottles, laundry), rare timed appointments.
- Walkthrough: morning routine at 6:30, checklist “pack diaper bag”, event “pediatrician 10:00”.
- Finding: timed routines must not crowd the checklist. Untimed “pack bag” would be wrongly placed on a calendar in Google Calendar.
- Implication: keep **time optional** on routines.

## 2. Jordan — office commute

- Needs: weekday gym 7:00, daily inbox-zero list, evening class Tuesday.
- Walkthrough: complete gym occurrence, check “review calendar”, see 18:00 class on the same scroll.
- Finding: weekdays vs weekend recurrence is table stakes; “every day” would annoy them.
- Implication: `byWeekday` on weekly rules is MVP, not polish.

## 3. Sam — student

- Needs: class blocks (timed), “study 2 hours” without a clock, semester goals.
- Walkthrough: checklist “read chapter 4” vs event “CHEM 10:00–11:15”.
- Finding: goals should not live on Today unless due; they clutter the hero screen.
- Implication: Goal entity exists in the model but stays off Today for v1 UI.

## 4. Priya — training for a race

- Needs: Mon/Wed/Fri run at 6:00, daily water/sleep checklist, long run Sunday.
- Walkthrough: skip one Friday (`exdates`), still see Sunday long run.
- Finding: skipping one occurrence without deleting the routine is required or they will abandon recurrence.
- Implication: `exdates` in the recurrence engine for v1.

## 5. Alex — hosts friends often

- Needs: personal evening routines, a public “coffee” slot on weekends.
- Walkthrough: Today is full Saturday 10–12; booking must not offer that hour.
- Finding: booking is valuable but secondary to trusting Today. They will not share a link until busy times look right.
- Implication: **defer live booking until Today + recurrence feel correct**; still lock one booking page in product scope.

## Synthesis used for this build

- Today is a single scroll: progress, routines, checklist, timeline.
- Recurrence supports daily + weekly weekdays + exceptions.
- Goals and Google sync stay out of the UI.
- Booking is specified in docs; busy-time helper is tested so a later booking page can plug in.

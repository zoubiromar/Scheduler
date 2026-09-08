import { useMemo } from "react";
import type { AppState, CalendarEvent, Routine } from "./types";
import { addDays, formatDisplayDate, formatTime } from "./lib/dates";
import { occursOn } from "./lib/recurrence";

interface TodayViewProps {
  date: string;
  state: AppState;
  onToggleRoutine: (routineId: string) => void;
  onToggleChecklist: (itemId: string) => void;
  onAddEvent: (event: CalendarEvent) => void;
  onShiftDate: (delta: number) => void;
}

function isRoutineDone(state: AppState, routineId: string, date: string): boolean {
  return state.completions.some((c) => c.routineId === routineId && c.date === date);
}

export function TodayView({
  date,
  state,
  onToggleRoutine,
  onToggleChecklist,
  onAddEvent,
  onShiftDate,
}: TodayViewProps) {
  const routinesToday = useMemo(
    () => state.routines.filter((routine) => occursOn(routine.recurrence, date)),
    [state.routines, date],
  );

  const timedRoutines = routinesToday.filter((r) => r.startTime);
  const untimedRoutines = routinesToday.filter((r) => !r.startTime);

  const eventsToday = state.events
    .filter((event) => event.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const timeline: { time: string; title: string; meta: string }[] = [
    ...timedRoutines.map((routine) => ({
      time: routine.startTime as string,
      title: routine.title,
      meta: `routine · ${routine.durationMinutes ?? 0} min`,
    })),
    ...eventsToday.map((event) => ({
      time: event.startTime,
      title: event.title,
      meta: `${event.source} · ${event.durationMinutes} min`,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const daily = state.dailyChecklists.find((d) => d.date === date);
  const doneItems = new Set(daily?.doneItemIds ?? []);

  const checklistTotal = state.checklist.items.length;
  const checklistDone = state.checklist.items.filter((item) => doneItems.has(item.id)).length;
  const routinesDone = routinesToday.filter((r) => isRoutineDone(state, r.id, date)).length;
  const total = checklistTotal + routinesToday.length;
  const done = checklistDone + routinesDone;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  function handleAdd(form: HTMLFormElement) {
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const startTime = String(data.get("startTime") ?? "09:00");
    const durationMinutes = Number(data.get("durationMinutes") ?? 60);
    if (!title) return;
    onAddEvent({
      id: crypto.randomUUID(),
      title,
      date,
      startTime,
      durationMinutes,
      source: "manual",
    });
    form.reset();
  }

  return (
    <div>
      <div className="date-row">
        <button className="ghost" type="button" onClick={() => onShiftDate(-1)}>
          Previous
        </button>
        <strong>{formatDisplayDate(date)}</strong>
        <button className="ghost" type="button" onClick={() => onShiftDate(1)}>
          Next
        </button>
        <button className="ghost" type="button" onClick={() => onShiftDate(0)}>
          Today
        </button>
      </div>

      <div className="progress-track" aria-label={`${percent} percent complete`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="caption">
        {done} of {total} done today
        {state.goals[0] ? ` · Goal (kept off this screen): ${state.goals[0].title}` : ""}
      </p>

      <section>
        <h2>Routines</h2>
        {routinesToday.length === 0 ? (
          <p className="empty">No routines on this day.</p>
        ) : (
          [...untimedRoutines, ...timedRoutines].map((routine: Routine) => (
            <div className="card" key={routine.id}>
              <button
                className={`check${isRoutineDone(state, routine.id, date) ? " on" : ""}`}
                type="button"
                aria-label={`Toggle ${routine.title}`}
                onClick={() => onToggleRoutine(routine.id)}
              />
              <div>
                <div>{routine.title}</div>
                <div className="meta">
                  {routine.startTime
                    ? `${formatTime(routine.startTime)} · ${routine.durationMinutes} min`
                    : (routine.notes ?? "Untimed")}
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Daily checklist</h2>
        {state.checklist.items.map((item) => (
          <div className="card" key={item.id}>
            <button
              className={`check${doneItems.has(item.id) ? " on" : ""}`}
              type="button"
              aria-label={`Toggle ${item.title}`}
              onClick={() => onToggleChecklist(item.id)}
            />
            <div>{item.title}</div>
          </div>
        ))}
      </section>

      <section>
        <h2>On the clock</h2>
        {timeline.length === 0 ? (
          <p className="empty">Nothing timed. Add an event below.</p>
        ) : (
          timeline.map((item) => (
            <div className="card" key={`${item.time}-${item.title}`}>
              <div className="time">{formatTime(item.time)}</div>
              <div>
                {item.title}
                <div className="meta">{item.meta}</div>
              </div>
            </div>
          ))
        )}
      </section>

      <form
        className="event-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd(e.currentTarget);
        }}
      >
        <input className="span-2" name="title" placeholder="Add a timed event" required />
        <input name="startTime" type="time" defaultValue="15:00" />
        <input name="durationMinutes" type="number" min={15} step={15} defaultValue={60} />
        <button className="primary span-2" type="submit">
          Add to {date}
        </button>
      </form>
    </div>
  );
}

export function shiftIso(date: string, delta: number, today: string): string {
  if (delta === 0) return today;
  return addDays(date, delta);
}

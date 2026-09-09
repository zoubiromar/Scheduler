import { useEffect, useMemo, useState } from "react";
import type { AppState, CalendarEvent } from "./types";
import { TodayView, shiftIso } from "./TodayView";
import { WeekView } from "./WeekView";
import { loadState, saveState, seedState } from "./lib/storage";
import { addDays, todayISO } from "./lib/dates";
import { busyRangesOnDate, formatSlot, freeSlots, weekdayWindow } from "./lib/availability";

type Tab = "today" | "week" | "book";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [date, setDate] = useState(todayISO);
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const today = todayISO();

  function toggleRoutine(routineId: string) {
    setState((current) => {
      const exists = current.completions.some(
        (c) => c.routineId === routineId && c.date === date,
      );
      return {
        ...current,
        completions: exists
          ? current.completions.filter(
              (c) => !(c.routineId === routineId && c.date === date),
            )
          : [...current.completions, { routineId, date }],
      };
    });
  }

  function toggleChecklist(itemId: string) {
    setState((current) => {
      const existing = current.dailyChecklists.find((d) => d.date === date);
      const done = new Set(existing?.doneItemIds ?? []);
      if (done.has(itemId)) done.delete(itemId);
      else done.add(itemId);
      const next = { date, doneItemIds: [...done] };
      return {
        ...current,
        dailyChecklists: [
          ...current.dailyChecklists.filter((d) => d.date !== date),
          next,
        ],
      };
    });
  }

  function addEvent(event: CalendarEvent) {
    setState((current) => ({ ...current, events: [...current.events, event] }));
  }

  const bookSlots = useMemo(() => {
    const page = state.bookingPage;
    const window = weekdayWindow(page.weeklyHours, date);
    if (!window) return [];
    const busy = busyRangesOnDate(date, state.routines, state.events);
    return freeSlots({
      window,
      busy,
      durationMinutes: page.durationMinutes,
      bufferMinutes: page.bufferMinutes,
    });
  }, [state, date]);

  return (
    <div>
      <header className="app-header">
        <div>
          <p className="eyebrow">Dayline</p>
          <h1>Your day, in one place</h1>
        </div>
        <nav className="nav">
          <button className={tab === "today" ? "active" : ""} type="button" onClick={() => setTab("today")}>
            Today
          </button>
          <button className={tab === "week" ? "active" : ""} type="button" onClick={() => setTab("week")}>
            Week
          </button>
          <button className={tab === "book" ? "active" : ""} type="button" onClick={() => setTab("book")}>
            Booking
          </button>
        </nav>
      </header>

      {tab === "today" && (
        <TodayView
          date={date}
          state={state}
          onToggleRoutine={toggleRoutine}
          onToggleChecklist={toggleChecklist}
          onAddEvent={addEvent}
          onShiftDate={(delta) => setDate(shiftIso(date, delta, today))}
        />
      )}

      {tab === "week" && (
        <WeekView
          date={date}
          state={state}
          onSelectDate={(iso) => {
            setDate(iso);
            setTab("today");
          }}
        />
      )}

      {tab === "book" && (
        <section>
          <h2>One booking page (MVP spec)</h2>
          <p className="caption">
            Public link would be /book/{state.bookingPage.slug}. Guest booking confirmations
            are deferred until Today-view tests. Free slots use timed routines + events.
          </p>
          <div className="card">
            <div>
              <div>{state.bookingPage.title}</div>
              <div className="meta">
                {state.bookingPage.durationMinutes} min · buffer {state.bookingPage.bufferMinutes} min
              </div>
            </div>
          </div>
          <p className="caption">Open hours on {date}:</p>
          {bookSlots.length === 0 ? (
            <p className="empty">No free slots this day (weekend hours only in the seed).</p>
          ) : (
            bookSlots.map((slot) => (
              <div className="card" key={slot.startMinutes}>
                <div className="time">{formatSlot(slot)}</div>
                <div>Available</div>
              </div>
            ))
          )}
          <div className="date-row">
            <button className="ghost" type="button" onClick={() => setDate(addDays(date, 1))}>
              Check next day
            </button>
          </div>
        </section>
      )}

      <p className="footer-note">
        Completions are saved on this device. Google Calendar two-way sync is out of scope.
        <button
          className="ghost"
          type="button"
          style={{ marginLeft: 8 }}
          onClick={() => {
            localStorage.removeItem("dayline.v1");
            setState(seedState());
          }}
        >
          Reset demo data
        </button>
      </p>
    </div>
  );
}

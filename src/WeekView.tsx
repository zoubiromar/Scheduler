import type { AppState } from "./types";
import { addDays, formatTime, startOfWeekMonday, todayISO } from "./lib/dates";
import { occursOn } from "./lib/recurrence";

interface WeekViewProps {
  date: string;
  state: AppState;
  onSelectDate: (iso: string) => void;
}

export function WeekView({ date, state, onSelectDate }: WeekViewProps) {
  const start = startOfWeekMonday(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayISO();

  return (
    <div className="week">
      {days.map((iso) => {
        const routines = state.routines.filter(
          (routine) => occursOn(routine.recurrence, iso) && routine.startTime,
        );
        const events = state.events.filter((event) => event.date === iso);
        return (
          <button
            type="button"
            className={`week-day${iso === today ? " today" : ""}`}
            key={iso}
            onClick={() => onSelectDate(iso)}
          >
            <strong>{iso.slice(5)}</strong>
            {routines.map((routine) => (
              <p key={routine.id}>
                {formatTime(routine.startTime as string)} {routine.title}
              </p>
            ))}
            {events.map((event) => (
              <p key={event.id}>
                {formatTime(event.startTime)} {event.title}
              </p>
            ))}
          </button>
        );
      })}
    </div>
  );
}

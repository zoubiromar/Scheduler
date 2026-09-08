import type { AppState } from "./types";
import {
  addDays,
  formatTime,
  formatWeekdayLabel,
  startOfWeekMonday,
  todayISO,
} from "./lib/dates";
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
        const entries = [
          ...state.routines
            .filter((routine) => occursOn(routine.recurrence, iso) && routine.startTime)
            .map((routine) => ({
              key: routine.id,
              startTime: routine.startTime as string,
              title: routine.title,
            })),
          ...state.events
            .filter((event) => event.date === iso)
            .map((event) => ({
              key: event.id,
              startTime: event.startTime,
              title: event.title,
            })),
        ].sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <button
            type="button"
            className={`week-day${iso === today ? " today" : ""}`}
            key={iso}
            onClick={() => onSelectDate(iso)}
          >
            <strong>{formatWeekdayLabel(iso)}</strong>
            {entries.map((entry) => (
              <p key={entry.key}>
                {formatTime(entry.startTime)} {entry.title}
              </p>
            ))}
          </button>
        );
      })}
    </div>
  );
}

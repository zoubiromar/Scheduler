import { TagFilter } from "./TagFilter";
import {
  addDays,
  formatTime,
  formatWeekdayLabel,
  minutesFromTime,
  startOfWeekMonday,
  todayISO,
} from "./lib/dates";
import { occursOn } from "./lib/recurrence";
import type { AppState } from "./types";

interface WeekViewProps {
  date: string;
  state: AppState;
  selectedTagId: string | null;
  onFilterChange: (tagId: string | null) => void;
  onToggleTask: (taskId: string, date: string) => void;
  onShiftWeek: (delta: number) => void;
  onSelectDate: (iso: string) => void;
}

interface BarItem {
  id: string;
  title: string;
  startTime: string;
  duration: number;
  tagIds: string[];
  lane: number;
}

function assignLanes(items: Omit<BarItem, "lane">[]): BarItem[] {
  const laneEnds: number[] = [];
  return [...items]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((item) => {
      const start = minutesFromTime(item.startTime);
      let lane = laneEnds.findIndex((end) => end <= start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = start + item.duration;
      return { ...item, lane };
    });
}

export function WeekView({
  date,
  state,
  selectedTagId,
  onFilterChange,
  onToggleTask,
  onShiftWeek,
  onSelectDate,
}: WeekViewProps) {
  const start = startOfWeekMonday(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayISO();

  return (
    <div>
      <div className="week-toolbar">
        <button className="ghost" type="button" onClick={() => onShiftWeek(-1)}>Previous week</button>
        <strong>{start} — {days[6]}</strong>
        <button className="ghost" type="button" onClick={() => onShiftWeek(1)}>Next week</button>
      </div>
      <TagFilter tags={state.tags} selectedId={selectedTagId} onChange={onFilterChange} />
      <div className="week-hours" aria-hidden="true">
        <span>8am</span><span>12pm</span><span>4pm</span><span>8pm</span><span>12am</span>
      </div>
      <div className="week-stack">
        {days.map((iso) => {
          const tasks = state.tasks.filter(
            (task) =>
              occursOn(task.recurrence, iso) &&
              (selectedTagId === null || task.tagIds.includes(selectedTagId)),
          );
          const timed = assignLanes([
            ...tasks
              .filter((task) => task.startTime)
              .map((task) => ({
                id: `task-${task.id}`,
                title: task.title,
                startTime: task.startTime!,
                duration: task.durationMinutes ?? 0,
                tagIds: task.tagIds,
              })),
          ...state.events
            .filter(
              (event) =>
                event.date === iso &&
                (selectedTagId === null || event.tagIds.includes(selectedTagId)),
            )
            .map((event) => ({
              id: `event-${event.id}`,
              startTime: event.startTime,
              title: event.title,
              duration: event.durationMinutes,
              tagIds: event.tagIds,
            })),
          ]);
          const inBar = timed.filter((item) => {
            const startMinutes = minutesFromTime(item.startTime);
            return startMinutes >= 480 && startMinutes + item.duration <= 1440;
          });
          const overflow = timed.filter((item) => !inBar.includes(item));
          const untimed = tasks.filter((task) => !task.startTime);
          const doneIds = new Set(
            state.completions
              .filter((completion) => completion.date === iso)
              .map((completion) => completion.taskId),
          );
          const lanes = Math.max(1, ...inBar.map((item) => item.lane + 1));

          return (
            <div className={`week-row${iso === today ? " today" : ""}`} key={iso}>
              <button className="day-label" type="button" onClick={() => onSelectDate(iso)}>
                <strong>{formatWeekdayLabel(iso)}</strong>
                <span>{iso.slice(5)}</span>
              </button>
              <div className="day-schedule">
                <div className="timeline-bar" style={{ "--lanes": lanes } as React.CSSProperties}>
                  <div className="time-guides" aria-hidden="true" />
                  {inBar.map((item) => {
                    const startMinutes = minutesFromTime(item.startTime);
                    const left = ((startMinutes - 480) / 960) * 100;
                    const width = Math.max((item.duration / 960) * 100, 2);
                    const color =
                      state.tags.find((tag) => item.tagIds.includes(tag.id))?.color ?? "#6b6258";
                    return (
                      <div
                        className="timeline-item"
                        key={item.id}
                        title={`${formatTime(item.startTime)} · ${item.title} · ${item.duration} min`}
                        style={{
                          left: `${left}%`,
                          width: `${Math.min(width, 100 - left)}%`,
                          top: `${item.lane * 34 + 5}px`,
                          "--tag-color": color,
                        } as React.CSSProperties}
                      >
                        <span>{formatTime(item.startTime)}</span>
                        <strong>{item.title}</strong>
                      </div>
                    );
                  })}
                </div>
                {overflow.length > 0 && (
                  <div className="overflow-list">
                    {overflow.map((item) => (
                      <span className="overflow-chip" key={item.id}>
                        {formatTime(item.startTime)} · {item.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="untimed-column">
                {untimed.length === 0 ? (
                  <span className="empty small">No anytime tasks</span>
                ) : (
                  untimed.map((task) => (
                    <label className={`mini-task${doneIds.has(task.id) ? " done" : ""}`} key={task.id}>
                      <input
                        type="checkbox"
                        checked={doneIds.has(task.id)}
                        onChange={() => onToggleTask(task.id, iso)}
                      />
                      <span>{task.title}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

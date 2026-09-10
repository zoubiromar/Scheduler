import { TagFilter } from "./TagFilter";
import {
  addDays,
  formatTime,
  formatWeekdayLabel,
  minutesFromTime,
  startOfWeekMonday,
  todayISO,
} from "./lib/dates";
import { resolveTaskOccurrences } from "./lib/occurrences";
import type { AppState } from "./types";

interface WeekViewProps {
  date: string;
  state: AppState;
  selectedTagId: string | null;
  onFilterChange: (tagId: string | null) => void;
  onToggleTask: (taskId: string, date: string) => void;
  onToggleEvent: (eventId: string) => void;
  fullWidth: boolean;
  onFullWidthChange: (value: boolean) => void;
  onShiftWeek: (delta: number) => void;
  onSelectDate: (iso: string) => void;
}

interface BarItem {
  id: string;
  sourceId: string;
  completionDate?: string;
  kind: "task" | "event";
  title: string;
  startTime: string;
  duration: number;
  tagIds: string[];
  completed: boolean;
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
  onToggleEvent,
  fullWidth,
  onFullWidthChange,
  onShiftWeek,
  onSelectDate,
}: WeekViewProps) {
  const start = startOfWeekMonday(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayISO();

  return (
    <div className={`week-view${fullWidth ? " full-width" : ""}`}>
      <div className="week-toolbar">
        <button className="ghost" type="button" onClick={() => onShiftWeek(-1)}>Previous week</button>
        <strong>{start} — {days[6]}</strong>
        <button className="ghost" type="button" onClick={() => onShiftWeek(1)}>Next week</button>
        <label className="width-toggle">
          <input
            type="checkbox"
            checked={fullWidth}
            onChange={(event) => onFullWidthChange(event.target.checked)}
          />
          <span>Full width</span>
        </label>
      </div>
      <TagFilter tags={state.tags} selectedId={selectedTagId} onChange={onFilterChange} />
      <div className="week-hours" aria-hidden="true">
        <span>8am</span><span>12pm</span><span>4pm</span><span>8pm</span><span>12am</span>
      </div>
      <div className="week-stack">
        {days.map((iso) => {
          const occurrences = resolveTaskOccurrences(
            state.tasks,
            state.occurrenceOverrides,
            iso,
          ).filter(
            (occurrence) =>
              selectedTagId === null || occurrence.tagIds.includes(selectedTagId),
          );
          const completionKeys = new Set(
            state.completions.map(
              (completion) => `${completion.taskId}:${completion.date}`,
            ),
          );
          const timed = assignLanes([
            ...occurrences
              .filter((occurrence) => occurrence.startTime)
              .map((occurrence) => ({
                id: `task-${occurrence.key}`,
                sourceId: occurrence.taskId,
                completionDate: occurrence.originalDate,
                kind: "task" as const,
                title: occurrence.title,
                startTime: occurrence.startTime!,
                duration: occurrence.durationMinutes ?? 0,
                tagIds: occurrence.tagIds,
                completed: completionKeys.has(occurrence.key),
              })),
          ...state.events
            .filter(
              (event) =>
                event.date === iso &&
                event.startTime &&
                (selectedTagId === null || event.tagIds.includes(selectedTagId)),
            )
            .map((event) => ({
              id: `event-${event.id}`,
              sourceId: event.id,
              kind: "event" as const,
              startTime: event.startTime!,
              title: event.title,
              duration: event.durationMinutes ?? 0,
              tagIds: event.tagIds,
              completed: Boolean(event.completed),
            })),
          ]);
          const inBar = timed.filter((item) => {
            const startMinutes = minutesFromTime(item.startTime);
            return startMinutes >= 480 && startMinutes + item.duration <= 1440;
          });
          const overflow = timed.filter((item) => !inBar.includes(item));
          const untimedOccurrences = occurrences.filter(
            (occurrence) => !occurrence.startTime,
          );
          const untimedEvents = state.events.filter(
            (event) =>
              event.date === iso &&
              !event.startTime &&
              (selectedTagId === null || event.tagIds.includes(selectedTagId)),
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
                        className={`timeline-item${item.completed ? " completed" : ""}`}
                        key={item.id}
                        title={`${formatTime(item.startTime)} · ${item.title} · ${item.duration} min`}
                        tabIndex={0}
                        style={{
                          left: `${left}%`,
                          width: `${Math.min(width, 100 - left)}%`,
                          top: `${item.lane * 34 + 5}px`,
                          "--tag-color": color,
                        } as React.CSSProperties}
                      >
                        <strong>{item.title}</strong>
                        <span className="timeline-tooltip" role="tooltip">
                          <strong>{item.title}</strong>
                          <span>{formatTime(item.startTime)} · {item.duration} min</span>
                          {item.tagIds.length > 0 && (
                            <span>
                              {item.tagIds
                                .map((id) => state.tags.find((tag) => tag.id === id)?.name)
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                          <label>
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() =>
                                item.kind === "task"
                                  ? onToggleTask(item.sourceId, item.completionDate!)
                                  : onToggleEvent(item.sourceId)
                              }
                            />
                            Completed
                          </label>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {overflow.length > 0 && (
                  <div className="overflow-list">
                    {overflow.map((item) => (
                      <label className={`overflow-chip${item.completed ? " completed" : ""}`} key={item.id}>
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() =>
                            item.kind === "task"
                              ? onToggleTask(item.sourceId, item.completionDate!)
                              : onToggleEvent(item.sourceId)
                          }
                        />
                        {formatTime(item.startTime)} · {item.title}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="untimed-column">
                {untimedOccurrences.length === 0 && untimedEvents.length === 0 ? (
                  <span className="empty small">No anytime tasks</span>
                ) : (
                  <>
                  {untimedOccurrences.map((occurrence) => (
                    <label
                      className={`mini-task${completionKeys.has(occurrence.key) ? " done" : ""}`}
                      key={occurrence.key}
                    >
                      <input
                        type="checkbox"
                        checked={completionKeys.has(occurrence.key)}
                        onChange={() =>
                          onToggleTask(occurrence.taskId, occurrence.originalDate)
                        }
                      />
                      <span>{occurrence.title}</span>
                    </label>
                  ))}
                  {untimedEvents.map((event) => (
                    <label className={`mini-task${event.completed ? " done" : ""}`} key={event.id}>
                      <input
                        type="checkbox"
                        checked={Boolean(event.completed)}
                        onChange={() => onToggleEvent(event.id)}
                      />
                      <span>{event.title}</span>
                    </label>
                  ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

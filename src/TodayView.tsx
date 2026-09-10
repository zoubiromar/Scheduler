import { useMemo, useState } from "react";
import { TagFilter } from "./TagFilter";
import { TagPill } from "./TasksView";
import { addDays, formatDisplayDate, formatShortDate, formatTime } from "./lib/dates";
import { occursOn } from "./lib/recurrence";
import type { AppState, CalendarEvent } from "./types";

interface TodayViewProps {
  date: string;
  state: AppState;
  selectedTagId: string | null;
  onFilterChange: (tagId: string | null) => void;
  onToggleTask: (taskId: string, date: string) => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onCreateRepeating: () => void;
  onShiftDate: (delta: number) => void;
}

export function TodayView({
  date,
  state,
  selectedTagId,
  onFilterChange,
  onToggleTask,
  onSaveEvent,
  onDeleteEvent,
  onCreateRepeating,
  onShiftDate,
}: TodayViewProps) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const tasksToday = useMemo(
    () =>
      state.tasks.filter(
        (task) =>
          occursOn(task.recurrence, date) &&
          (selectedTagId === null || task.tagIds.includes(selectedTagId)),
      ),
    [state.tasks, date, selectedTagId],
  );
  const untimed = tasksToday.filter((task) => !task.startTime);
  const timedTasks = tasksToday.filter((task) => task.startTime);
  const events = state.events.filter(
    (event) =>
      event.date === date &&
      (selectedTagId === null || event.tagIds.includes(selectedTagId)),
  );
  const timeline = [
    ...timedTasks.map((task) => ({
      kind: "task" as const,
      id: task.id,
      time: task.startTime!,
      duration: task.durationMinutes ?? 0,
      title: task.title,
      tagIds: task.tagIds,
    })),
    ...events.map((event) => ({
      kind: "event" as const,
      id: event.id,
      time: event.startTime,
      duration: event.durationMinutes,
      title: event.title,
      tagIds: event.tagIds,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const allTasksToday = state.tasks.filter((task) => occursOn(task.recurrence, date));
  const doneIds = new Set(
    state.completions
      .filter((completion) => completion.date === date)
      .map((completion) => completion.taskId),
  );
  const done = allTasksToday.filter((task) => doneIds.has(task.id)).length;
  const percent = allTasksToday.length === 0 ? 0 : Math.round((done / allTasksToday.length) * 100);

  const editingEvent = state.events.find((event) => event.id === editingEventId);

  function saveEvent(form: HTMLFormElement) {
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    onSaveEvent({
      id: editingEvent?.id ?? crypto.randomUUID(),
      title,
      date,
      startTime: String(data.get("startTime") ?? "09:00"),
      durationMinutes: Number(data.get("durationMinutes") ?? 60),
      source: editingEvent?.source ?? "manual",
      tagIds: data.getAll("tagIds").map(String),
    });
    setEditingEventId(null);
    form.reset();
  }

  return (
    <div>
      <div className="date-row">
        <button className="ghost" type="button" onClick={() => onShiftDate(-1)}>Previous</button>
        <strong>{formatDisplayDate(date)}</strong>
        <button className="ghost" type="button" onClick={() => onShiftDate(1)}>Next</button>
        <button className="ghost" type="button" onClick={() => onShiftDate(0)}>Today</button>
      </div>

      <TagFilter tags={state.tags} selectedId={selectedTagId} onChange={onFilterChange} />
      <div className="progress-track" aria-label={`${percent} percent complete`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="caption">{done} of {allTasksToday.length} repeating tasks done today</p>

      <section>
        <div className="section-heading compact">
          <h2>Anytime</h2>
          <button className="ghost" type="button" onClick={onCreateRepeating}>New repeating task</button>
        </div>
        {untimed.length === 0 ? (
          <p className="empty">No untimed tasks match this day and filter.</p>
        ) : (
          untimed.map((task) => (
            <div className={`card${doneIds.has(task.id) ? " completed" : ""}`} key={task.id}>
              <button
                className={`check${doneIds.has(task.id) ? " on" : ""}`}
                type="button"
                aria-label={`Toggle ${task.title}`}
                onClick={() => onToggleTask(task.id, date)}
              />
              <div className="card-content">
                <div>{task.title}</div>
                {task.notes && <div className="meta">{task.notes}</div>}
                <TagList ids={task.tagIds} state={state} />
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>On the clock</h2>
        {timeline.length === 0 ? (
          <p className="empty">Nothing timed. Add an event below.</p>
        ) : (
          timeline.map((item) => (
            <div className={`card${item.kind === "task" && doneIds.has(item.id) ? " completed" : ""}`} key={`${item.kind}-${item.id}`}>
              {item.kind === "task" && (
                <button
                  className={`check${doneIds.has(item.id) ? " on" : ""}`}
                  type="button"
                  aria-label={`Toggle ${item.title}`}
                  onClick={() => onToggleTask(item.id, date)}
                />
              )}
              <div className="time">{formatTime(item.time)}</div>
              <div className="card-content">
                <div>{item.title}</div>
                <div className="meta">{item.duration} min</div>
                <TagList ids={item.tagIds} state={state} />
              </div>
              {item.kind === "event" && (
                <button className="ghost card-action" type="button" onClick={() => setEditingEventId(item.id)}>
                  Edit
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <form
        className="event-form"
        key={editingEvent?.id ?? "new-event"}
        onSubmit={(event) => {
          event.preventDefault();
          saveEvent(event.currentTarget);
        }}
      >
        <div className="form-title span-2">
          <strong>{editingEvent ? "Edit one-time event" : "Add a one-time event"}</strong>
          {editingEvent && (
            <button className="ghost" type="button" onClick={() => setEditingEventId(null)}>Cancel</button>
          )}
        </div>
        <input className="span-2" name="title" placeholder="Event name" defaultValue={editingEvent?.title} required />
        <input name="startTime" type="time" defaultValue={editingEvent?.startTime ?? "15:00"} />
        <input name="durationMinutes" type="number" min={5} step={5} defaultValue={editingEvent?.durationMinutes ?? 60} />
        <div className="tag-checks span-2">
          {state.tags.map((tag) => (
            <label key={tag.id}>
              <input
                type="checkbox"
                name="tagIds"
                value={tag.id}
                defaultChecked={editingEvent?.tagIds.includes(tag.id)}
              />
              {tag.name}
            </label>
          ))}
        </div>
        {editingEvent && (
          <button
            className="danger"
            type="button"
            onClick={() => {
              onDeleteEvent(editingEvent.id);
              setEditingEventId(null);
            }}
          >
            Delete
          </button>
        )}
        <button className="primary" type="submit">
          {editingEvent ? "Save event" : `Add to ${formatShortDate(date)}`}
        </button>
      </form>
    </div>
  );
}

function TagList({ ids, state }: { ids: string[]; state: AppState }) {
  if (ids.length === 0) return null;
  return (
    <div className="tag-list">
      {ids.map((id) => {
        const tag = state.tags.find((candidate) => candidate.id === id);
        return tag ? <TagPill tag={tag} key={id} /> : null;
      })}
    </div>
  );
}

export function shiftIso(date: string, delta: number, today: string): string {
  return delta === 0 ? today : addDays(date, delta);
}

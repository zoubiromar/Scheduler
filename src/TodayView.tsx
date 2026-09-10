import { useMemo, useState } from "react";
import { EventEditor } from "./EventEditor";
import { OccurrenceEditor } from "./OccurrenceEditor";
import { TagFilter } from "./TagFilter";
import { TagPill } from "./TasksView";
import { addDays, formatDisplayDate, formatTime } from "./lib/dates";
import { resolveTaskOccurrences } from "./lib/occurrences";
import type { AppState, CalendarEvent, TaskOccurrenceOverride } from "./types";

interface TodayViewProps {
  date: string;
  state: AppState;
  selectedTagId: string | null;
  onFilterChange: (tagId: string | null) => void;
  onToggleTask: (taskId: string, date: string) => void;
  onToggleEvent: (eventId: string) => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onSaveOccurrenceOverride: (override: TaskOccurrenceOverride) => void;
  onResetOccurrence: (taskId: string, originalDate: string) => void;
  onCreateRepeating: () => void;
  onCreateTag: (tag: AppState["tags"][number]) => void;
  onShiftDate: (delta: number) => void;
}

export function TodayView({
  date,
  state,
  selectedTagId,
  onFilterChange,
  onToggleTask,
  onToggleEvent,
  onSaveEvent,
  onDeleteEvent,
  onSaveOccurrenceOverride,
  onResetOccurrence,
  onCreateRepeating,
  onCreateTag,
  onShiftDate,
}: TodayViewProps) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingOccurrenceKey, setEditingOccurrenceKey] = useState<string | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const occurrencesToday = useMemo(
    () =>
      resolveTaskOccurrences(state.tasks, state.occurrenceOverrides, date).filter(
        (occurrence) =>
          selectedTagId === null || occurrence.tagIds.includes(selectedTagId),
      ),
    [state.tasks, state.occurrenceOverrides, date, selectedTagId],
  );
  const allOccurrencesToday = useMemo(
    () => resolveTaskOccurrences(state.tasks, state.occurrenceOverrides, date),
    [state.tasks, state.occurrenceOverrides, date],
  );
  const untimedOccurrences = occurrencesToday.filter((occurrence) => !occurrence.startTime);
  const timedOccurrences = occurrencesToday.filter((occurrence) => occurrence.startTime);
  const events = state.events.filter(
    (event) =>
      event.date === date &&
      (selectedTagId === null || event.tagIds.includes(selectedTagId)),
  );
  const untimedEvents = events.filter((event) => !event.startTime);
  const timedEvents = events.filter((event) => event.startTime);
  const completionKeys = new Set(
    state.completions.map((completion) => `${completion.taskId}:${completion.date}`),
  );
  const timeline = [
    ...timedOccurrences.map((occurrence) => ({
      kind: "task" as const,
      id: occurrence.key,
      occurrence,
      time: occurrence.startTime!,
      duration: occurrence.durationMinutes ?? 0,
      title: occurrence.title,
      tagIds: occurrence.tagIds,
      completed: completionKeys.has(occurrence.key),
    })),
    ...timedEvents.map((event) => ({
      kind: "event" as const,
      id: event.id,
      event,
      time: event.startTime!,
      duration: event.durationMinutes ?? 0,
      title: event.title,
      tagIds: event.tagIds,
      completed: Boolean(event.completed),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const done = allOccurrencesToday.filter((occurrence) =>
    completionKeys.has(occurrence.key),
  ).length;
  const percent =
    allOccurrencesToday.length === 0 ? 0 : Math.round((done / allOccurrencesToday.length) * 100);

  const editingEvent = state.events.find((event) => event.id === editingEventId);
  const editingOccurrence = allOccurrencesToday.find(
    (occurrence) => occurrence.key === editingOccurrenceKey,
  );

  function shiftDate(delta: number) {
    setEditingEventId(null);
    setEditingOccurrenceKey(null);
    setAddingEvent(false);
    onShiftDate(delta);
  }

  return (
    <div>
      <div className="date-row">
        <button className="ghost" type="button" onClick={() => shiftDate(-1)}>Previous</button>
        <strong>{formatDisplayDate(date)}</strong>
        <button className="ghost" type="button" onClick={() => shiftDate(1)}>Next</button>
        <button className="ghost" type="button" onClick={() => shiftDate(0)}>Today</button>
      </div>

      <TagFilter tags={state.tags} selectedId={selectedTagId} onChange={onFilterChange} />
      <div className="progress-track" aria-label={`${percent} percent complete`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="caption">{done} of {allOccurrencesToday.length} repeating tasks done today</p>

      {editingOccurrence && (
        <OccurrenceEditor
          key={editingOccurrence.key}
          occurrence={editingOccurrence}
          tags={state.tags}
          onCreateTag={onCreateTag}
          onCancel={() => setEditingOccurrenceKey(null)}
          onSave={(override) => {
            onSaveOccurrenceOverride(override);
            setEditingOccurrenceKey(null);
          }}
          onRemove={(override) => {
            onSaveOccurrenceOverride(override);
            setEditingOccurrenceKey(null);
          }}
          onReset={(taskId, originalDate) => {
            onResetOccurrence(taskId, originalDate);
            setEditingOccurrenceKey(null);
          }}
        />
      )}

      {editingEvent && (
        <EventEditor
          key={editingEvent.id}
          date={date}
          event={editingEvent}
          tags={state.tags}
          onCreateTag={onCreateTag}
          onCancel={() => setEditingEventId(null)}
          onSave={(event) => {
            onSaveEvent(event);
            setEditingEventId(null);
          }}
          onDelete={(eventId) => {
            onDeleteEvent(eventId);
            setEditingEventId(null);
          }}
        />
      )}

      <section>
        <div className="section-heading compact">
          <h2>Anytime</h2>
          <div className="section-actions">
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setEditingEventId(null);
                setEditingOccurrenceKey(null);
                setAddingEvent(true);
              }}
            >
              New one-time item
            </button>
            <button className="ghost" type="button" onClick={onCreateRepeating}>
              New repeating task
            </button>
          </div>
        </div>
        {untimedOccurrences.length === 0 && untimedEvents.length === 0 ? (
          <p className="empty">No untimed tasks match this day and filter.</p>
        ) : (
          <>
          {untimedOccurrences.map((occurrence) => (
            <div
              className={`card${completionKeys.has(occurrence.key) ? " completed" : ""}`}
              key={occurrence.key}
            >
              <button
                className={`check${completionKeys.has(occurrence.key) ? " on" : ""}`}
                type="button"
                aria-label={`Toggle ${occurrence.title}`}
                onClick={() => onToggleTask(occurrence.taskId, occurrence.originalDate)}
              />
              <div className="card-content">
                <div>{occurrence.title}</div>
                {occurrence.notes && <div className="meta">{occurrence.notes}</div>}
                <TagList ids={occurrence.tagIds} state={state} />
              </div>
              <button
                className="ghost card-action"
                type="button"
                onClick={() => {
                  setAddingEvent(false);
                  setEditingOccurrenceKey(occurrence.key);
                }}
              >
                Edit
              </button>
            </div>
          ))}
          {untimedEvents.map((event) => (
            <div className={`card${event.completed ? " completed" : ""}`} key={event.id}>
              <button
                className={`check${event.completed ? " on" : ""}`}
                type="button"
                aria-label={`Toggle ${event.title}`}
                onClick={() => onToggleEvent(event.id)}
              />
              <div className="card-content">
                <div>{event.title}</div>
                <TagList ids={event.tagIds} state={state} />
              </div>
              <button
                className="ghost card-action"
                type="button"
                onClick={() => {
                  setAddingEvent(false);
                  setEditingEventId(event.id);
                }}
              >
                Edit
              </button>
            </div>
          ))}
          </>
        )}
      </section>

      <section>
        <h2>On the clock</h2>
        {timeline.length === 0 ? (
          <p className="empty">Nothing timed. Add an event below.</p>
        ) : (
          timeline.map((item) => (
            <div className={`card${item.completed ? " completed" : ""}`} key={`${item.kind}-${item.id}`}>
              <button
                className={`check${item.completed ? " on" : ""}`}
                type="button"
                aria-label={`Mark ${item.title} ${item.completed ? "incomplete" : "complete"}`}
                onClick={() =>
                  item.kind === "task"
                    ? onToggleTask(item.occurrence.taskId, item.occurrence.originalDate)
                    : onToggleEvent(item.id)
                }
              />
              <div className="time">{formatTime(item.time)}</div>
              <div className="card-content">
                <div>{item.title}</div>
                <div className="meta">{item.duration} min</div>
                <TagList ids={item.tagIds} state={state} />
              </div>
              <button
                className="ghost card-action"
                type="button"
                onClick={() => {
                  setAddingEvent(false);
                  if (item.kind === "task") {
                    setEditingOccurrenceKey(item.occurrence.key);
                  } else {
                    setEditingEventId(item.id);
                  }
                }}
              >
                Edit
              </button>
            </div>
          ))
        )}
      </section>

      {!editingEvent && !editingOccurrence && addingEvent && (
        <EventEditor
          key={`new-${date}`}
          date={date}
          tags={state.tags}
          onCreateTag={onCreateTag}
          onCancel={() => setAddingEvent(false)}
          onSave={(event) => {
            onSaveEvent(event);
            setAddingEvent(false);
          }}
        />
      )}
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

import { useMemo, useState } from "react";
import { EventEditor } from "./EventEditor";
import { NewItemEditor } from "./NewItemEditor";
import { OccurrenceEditor } from "./OccurrenceEditor";
import { TagFilter } from "./TagFilter";
import { TagPill } from "./TasksView";
import { addDays, formatDisplayDate, formatTime } from "./lib/dates";
import { resolveTaskOccurrences } from "./lib/occurrences";
import type {
  AppState,
  CalendarEvent,
  RepeatingTask,
  TaskOccurrenceOverride,
} from "./types";

interface TodayViewProps {
  date: string;
  state: AppState;
  selectedTagId: string | null;
  onFilterChange: (tagId: string | null) => void;
  onToggleTask: (taskId: string, date: string) => void;
  onToggleEvent: (eventId: string) => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onSaveTask: (task: RepeatingTask) => void;
  onDeleteEvent: (eventId: string) => void;
  onSaveOccurrenceOverride: (override: TaskOccurrenceOverride) => void;
  onSkipOccurrence: (taskId: string, originalDate: string) => void;
  onResetOccurrence: (taskId: string, originalDate: string) => void;
  onEditSeries: (taskId: string) => void;
  onCreateTag: (tag: AppState["tags"][number]) => void;
  onShiftDate: (delta: number) => void;
  isToday: boolean;
}

export function TodayView({
  date,
  state,
  selectedTagId,
  onFilterChange,
  onToggleTask,
  onToggleEvent,
  onSaveEvent,
  onSaveTask,
  onDeleteEvent,
  onSaveOccurrenceOverride,
  onSkipOccurrence,
  onResetOccurrence,
  onEditSeries,
  onCreateTag,
  onShiftDate,
  isToday,
}: TodayViewProps) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingOccurrenceKey, setEditingOccurrenceKey] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
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
    setAddingItem(false);
    onShiftDate(delta);
  }

  return (
    <div>
      <div className="date-row">
        <button className="icon-button" type="button" aria-label="Previous day" onClick={() => shiftDate(-1)}>←</button>
        <strong>{formatDisplayDate(date)}</strong>
        <button className="icon-button" type="button" aria-label="Next day" onClick={() => shiftDate(1)}>→</button>
        {!isToday && (
          <button className="ghost" type="button" onClick={() => shiftDate(0)}>Today</button>
        )}
        <button
          className="primary add-item-button"
          type="button"
          aria-label="Add item"
          onClick={() => {
            setEditingEventId(null);
            setEditingOccurrenceKey(null);
            setAddingItem((value) => !value);
          }}
        >
          +
        </button>
      </div>

      <TagFilter tags={state.tags} selectedId={selectedTagId} onChange={onFilterChange} />
      {allOccurrencesToday.length > 0 && (
        <div
          className="progress-track"
          aria-label={`${done} of ${allOccurrencesToday.length} repeating tasks complete`}
          title={`${done} of ${allOccurrencesToday.length} complete`}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      )}

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
          onRemove={(taskId, originalDate) => {
            onSkipOccurrence(taskId, originalDate);
            setEditingOccurrenceKey(null);
          }}
          onReset={(taskId, originalDate) => {
            onResetOccurrence(taskId, originalDate);
            setEditingOccurrenceKey(null);
          }}
          onEditSeries={onEditSeries}
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

      {addingItem && (
        <NewItemEditor
          key={`new-${date}`}
          date={date}
          tags={state.tags}
          onCreateTag={onCreateTag}
          onCancel={() => setAddingItem(false)}
          onSaveEvent={(event) => {
            onSaveEvent(event);
            setAddingItem(false);
          }}
          onSaveTask={(task) => {
            onSaveTask(task);
            setAddingItem(false);
          }}
        />
      )}

      <section>
        <h2>Anytime</h2>
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
                  setAddingItem(false);
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
                  setAddingItem(false);
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
                  setAddingItem(false);
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

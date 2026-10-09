import { useMemo, useState } from "react";
import { DuoTodayBoard } from "./DuoTodayBoard";
import { EventEditor } from "./EventEditor";
import { NewItemEditor } from "./NewItemEditor";
import { OccurrenceEditor } from "./OccurrenceEditor";
import { TagFilter } from "./TagFilter";
import { addDays, formatDisplayDate } from "./lib/dates";
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
  const events = state.events.filter(
    (event) =>
      event.date === date &&
      (selectedTagId === null || event.tagIds.includes(selectedTagId)),
  );
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

      <DuoTodayBoard
        state={state}
        occurrences={occurrencesToday}
        events={events}
        onToggleTask={onToggleTask}
        onToggleEvent={onToggleEvent}
        onEditOccurrence={(key) => {
          setAddingItem(false);
          setEditingOccurrenceKey(key);
        }}
        onEditEvent={(eventId) => {
          setAddingItem(false);
          setEditingEventId(eventId);
        }}
      />
    </div>
  );
}

export function shiftIso(date: string, delta: number, today: string): string {
  return delta === 0 ? today : addDays(date, delta);
}

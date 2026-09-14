import { useEffect, useMemo, useState } from "react";
import type { AppState, CalendarEvent, TaskOccurrenceOverride } from "./types";
import { TodayView, shiftIso } from "./TodayView";
import { TasksView } from "./TasksView";
import { WeekView } from "./WeekView";
import { loadState, saveState, seedState, STORAGE_KEY } from "./lib/storage";
import { addDays, todayISO } from "./lib/dates";
import type { RepeatingTask, Tag } from "./types";

type Tab = "today" | "week" | "tasks";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [date, setDate] = useState(todayISO);
  const [tab, setTab] = useState<Tab>("today");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editTaskRequested, setEditTaskRequested] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const today = todayISO();

  function toggleTask(taskId: string, completionDate: string) {
    setState((current) => {
      const exists = current.completions.some(
        (completion) =>
          completion.taskId === taskId && completion.date === completionDate,
      );
      return {
        ...current,
        completions: exists
          ? current.completions.filter(
              (completion) =>
                !(
                  completion.taskId === taskId &&
                  completion.date === completionDate
                ),
            )
          : [...current.completions, { taskId, date: completionDate }],
      };
    });
  }

  function saveEvent(event: CalendarEvent) {
    setState((current) => ({
      ...current,
      events: [...current.events.filter((entry) => entry.id !== event.id), event],
    }));
  }

  function toggleEvent(eventId: string) {
    setState((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === eventId ? { ...event, completed: !event.completed } : event,
      ),
    }));
  }

  function saveTask(task: RepeatingTask) {
    setState((current) => ({
      ...current,
      tasks: [...current.tasks.filter((entry) => entry.id !== task.id), task],
    }));
  }

  function saveOccurrenceOverride(override: TaskOccurrenceOverride) {
    setState((current) => ({
      ...current,
      occurrenceOverrides: [
        ...current.occurrenceOverrides.filter(
          (entry) =>
            !(
              entry.taskId === override.taskId &&
              entry.originalDate === override.originalDate
            ),
        ),
        override,
      ],
    }));
  }

  function resetOccurrence(taskId: string, originalDate: string) {
    setState((current) => ({
      ...current,
      occurrenceOverrides: current.occurrenceOverrides.filter(
        (entry) => !(entry.taskId === taskId && entry.originalDate === originalDate),
      ),
    }));
  }

  function skipOccurrence(taskId: string, originalDate: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              recurrence: {
                ...task.recurrence,
                exdates: [
                  ...new Set([...(task.recurrence.exdates ?? []), originalDate]),
                ].sort(),
              },
            }
          : task,
      ),
      occurrenceOverrides: current.occurrenceOverrides.filter(
        (entry) => !(entry.taskId === taskId && entry.originalDate === originalDate),
      ),
    }));
  }

  function addTag(tag: Tag) {
    setState((current) =>
      current.tags.some(
        (existing) => existing.name.toLowerCase() === tag.name.toLowerCase(),
      )
        ? current
        : { ...current, tags: [...current.tags, tag] },
    );
  }

  function updateTag(tagId: string, patch: Partial<Pick<Tag, "name" | "color">>) {
    setState((current) => ({
      ...current,
      tags: current.tags.map((tag) => (tag.id === tagId ? { ...tag, ...patch } : tag)),
    }));
  }

  function deleteTag(tagId: string) {
    setState((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag.id !== tagId),
      tasks: current.tasks.map((task) => ({
        ...task,
        tagIds: task.tagIds.filter((id) => id !== tagId),
      })),
      events: current.events.map((event) => ({
        ...event,
        tagIds: event.tagIds.filter((id) => id !== tagId),
      })),
      occurrenceOverrides: current.occurrenceOverrides.map((override) => ({
        ...override,
        tagIds: override.tagIds.filter((id) => id !== tagId),
      })),
    }));
    if (selectedTagId === tagId) setSelectedTagId(null);
  }

  const tagUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const tag of state.tags) {
      usage[tag.id] =
        state.tasks.filter((task) => task.tagIds.includes(tag.id)).length +
        state.events.filter((event) => event.tagIds.includes(tag.id)).length +
        state.occurrenceOverrides.filter((override) => override.tagIds.includes(tag.id))
          .length;
    }
    return usage;
  }, [state.tags, state.tasks, state.events, state.occurrenceOverrides]);

  return (
    <div>
      <header className="app-header">
        <h1>Dayline</h1>
        <nav className="nav">
          <button className={tab === "today" ? "active" : ""} type="button" onClick={() => setTab("today")}>
            Today
          </button>
          <button className={tab === "week" ? "active" : ""} type="button" onClick={() => setTab("week")}>
            Week
          </button>
          <button
            className={tab === "tasks" ? "active" : ""}
            type="button"
            onClick={() => {
              setEditTaskRequested(null);
              setTab("tasks");
            }}
          >
            Tasks
          </button>
        </nav>
      </header>

      {tab === "today" && (
        <TodayView
          date={date}
          state={state}
          selectedTagId={selectedTagId}
          onFilterChange={setSelectedTagId}
          onToggleTask={toggleTask}
          onToggleEvent={toggleEvent}
          onSaveEvent={saveEvent}
          onSaveTask={saveTask}
          onDeleteEvent={(eventId) =>
            setState((current) => ({
              ...current,
              events: current.events.filter((event) => event.id !== eventId),
            }))
          }
          onSaveOccurrenceOverride={saveOccurrenceOverride}
          onSkipOccurrence={skipOccurrence}
          onResetOccurrence={resetOccurrence}
          onEditSeries={(taskId) => {
            setEditTaskRequested(taskId);
            setTab("tasks");
          }}
          onCreateTag={addTag}
          onShiftDate={(delta) => setDate(shiftIso(date, delta, today))}
          isToday={date === today}
        />
      )}

      {tab === "week" && (
        <WeekView
          date={date}
          state={state}
          selectedTagId={selectedTagId}
          onFilterChange={setSelectedTagId}
          onToggleTask={toggleTask}
          onToggleEvent={toggleEvent}
          onShiftWeek={(delta) => setDate(addDays(date, delta * 7))}
          onSelectDate={(iso) => {
            setDate(iso);
            setTab("today");
          }}
        />
      )}

      {tab === "tasks" && (
        <TasksView
          key={editTaskRequested ?? "tasks"}
          tasks={state.tasks}
          tags={state.tags}
          startEditingId={editTaskRequested}
          tagUsage={tagUsage}
          onEditorClosed={() => setEditTaskRequested(null)}
          onSaveTask={saveTask}
          onDeleteTask={(taskId) =>
            setState((current) => ({
              ...current,
              tasks: current.tasks.filter((task) => task.id !== taskId),
              occurrenceOverrides: current.occurrenceOverrides.filter(
                (override) => override.taskId !== taskId,
              ),
            }))
          }
          onCreateTag={addTag}
          onUpdateTag={updateTag}
          onDeleteTag={deleteTag}
          onResetData={() => {
            localStorage.removeItem(STORAGE_KEY);
            setState(seedState());
            setSelectedTagId(null);
          }}
        />
      )}
    </div>
  );
}

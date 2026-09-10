import { useEffect, useMemo, useState } from "react";
import type { AppState, CalendarEvent, TaskOccurrenceOverride } from "./types";
import { TodayView, shiftIso } from "./TodayView";
import { TasksView } from "./TasksView";
import { TagsView } from "./TagsView";
import { WeekView } from "./WeekView";
import { loadState, saveState, seedState, STORAGE_KEY } from "./lib/storage";
import { addDays, todayISO } from "./lib/dates";
import { busyRangesOnDate, formatSlot, freeSlots, weekdayWindow } from "./lib/availability";
import type { RepeatingTask, Tag } from "./types";

type Tab = "today" | "week" | "tasks" | "tags" | "book";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [date, setDate] = useState(todayISO);
  const [tab, setTab] = useState<Tab>("today");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [createTaskRequested, setCreateTaskRequested] = useState(false);
  const [weekFullWidth, setWeekFullWidth] = useState(
    () => localStorage.getItem("dayline.weekFullWidth") === "true",
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    localStorage.setItem("dayline.weekFullWidth", String(weekFullWidth));
  }, [weekFullWidth]);

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

  function addTag(tag: Tag) {
    setState((current) => ({ ...current, tags: [...current.tags, tag] }));
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

  const bookSlots = useMemo(() => {
    const page = state.bookingPage;
    const window = weekdayWindow(page.weeklyHours, date);
    if (!window) return [];
    const busy = busyRangesOnDate(
      date,
      state.tasks,
      state.events,
      state.occurrenceOverrides,
    );
    return freeSlots({
      window,
      busy,
      durationMinutes: page.durationMinutes,
      bufferMinutes: page.bufferMinutes,
    });
  }, [state, date]);

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
          <button className={tab === "tasks" ? "active" : ""} type="button" onClick={() => setTab("tasks")}>
            Tasks
          </button>
          <button className={tab === "tags" ? "active" : ""} type="button" onClick={() => setTab("tags")}>
            Tags
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
          selectedTagId={selectedTagId}
          onFilterChange={setSelectedTagId}
          onToggleTask={toggleTask}
          onToggleEvent={toggleEvent}
          onSaveEvent={saveEvent}
          onDeleteEvent={(eventId) =>
            setState((current) => ({
              ...current,
              events: current.events.filter((event) => event.id !== eventId),
            }))
          }
          onSaveOccurrenceOverride={saveOccurrenceOverride}
          onResetOccurrence={resetOccurrence}
          onCreateRepeating={() => {
            setCreateTaskRequested(true);
            setTab("tasks");
          }}
          onShiftDate={(delta) => setDate(shiftIso(date, delta, today))}
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
          fullWidth={weekFullWidth}
          onFullWidthChange={setWeekFullWidth}
          onShiftWeek={(delta) => setDate(addDays(date, delta * 7))}
          onSelectDate={(iso) => {
            setDate(iso);
            setTab("today");
          }}
        />
      )}

      {tab === "tasks" && (
        <TasksView
          key={createTaskRequested ? "create-requested" : "tasks"}
          tasks={state.tasks}
          tags={state.tags}
          startCreating={createTaskRequested}
          onEditorClosed={() => setCreateTaskRequested(false)}
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
        />
      )}

      {tab === "tags" && (
        <TagsView
          tags={state.tags}
          usage={tagUsage}
          onAdd={addTag}
          onUpdate={updateTag}
          onDelete={deleteTag}
        />
      )}

      {tab === "book" && (
        <section>
          <h2>One booking page (MVP spec)</h2>
          <p className="caption">
            Public link would be /book/{state.bookingPage.slug}. Guest booking confirmations
            are deferred until Today-view tests. Free slots use all timed tasks and events.
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
            localStorage.removeItem(STORAGE_KEY);
            setState(seedState());
          }}
        >
          Reset demo data
        </button>
        <span className="build-id" title="Deployed build">
          build {__BUILD_ID__}
        </span>
      </p>
    </div>
  );
}

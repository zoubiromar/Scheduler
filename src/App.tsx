import { useEffect, useMemo, useState } from "react";
import type { AppState, CalendarEvent } from "./types";
import { TodayView, shiftIso } from "./TodayView";
import { TasksView } from "./TasksView";
import { WeekView } from "./WeekView";
import { loadState, saveState, seedState, STORAGE_KEY } from "./lib/storage";
import { addDays, todayISO } from "./lib/dates";
import { busyRangesOnDate, formatSlot, freeSlots, weekdayWindow } from "./lib/availability";
import type { RepeatingTask, Tag } from "./types";

type Tab = "today" | "week" | "tasks" | "book";

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [date, setDate] = useState(todayISO);
  const [tab, setTab] = useState<Tab>("today");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [createTaskRequested, setCreateTaskRequested] = useState(false);

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

  function saveTask(task: RepeatingTask) {
    setState((current) => ({
      ...current,
      tasks: [...current.tasks.filter((entry) => entry.id !== task.id), task],
    }));
  }

  function addTag(tag: Tag) {
    setState((current) => ({ ...current, tags: [...current.tags, tag] }));
  }

  function renameTag(tagId: string, name: string) {
    setState((current) => ({
      ...current,
      tags: current.tags.map((tag) => (tag.id === tagId ? { ...tag, name } : tag)),
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
    }));
    if (selectedTagId === tagId) setSelectedTagId(null);
  }

  const bookSlots = useMemo(() => {
    const page = state.bookingPage;
    const window = weekdayWindow(page.weeklyHours, date);
    if (!window) return [];
    const busy = busyRangesOnDate(date, state.tasks, state.events);
    return freeSlots({
      window,
      busy,
      durationMinutes: page.durationMinutes,
      bufferMinutes: page.bufferMinutes,
    });
  }, [state, date]);

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
          onSaveEvent={saveEvent}
          onDeleteEvent={(eventId) =>
            setState((current) => ({
              ...current,
              events: current.events.filter((event) => event.id !== eventId),
            }))
          }
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
            }))
          }
          onAddTag={addTag}
          onRenameTag={renameTag}
          onDeleteTag={deleteTag}
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
      </p>
    </div>
  );
}

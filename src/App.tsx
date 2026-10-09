import { useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import {
  deleteCloudOverride,
  deleteCloudTag,
  deleteScheduleItem,
  setCloudCompletion,
  upsertCloudOverride,
  upsertCloudTag,
  upsertScheduleItem,
} from "./data/scheduleRepository";
import { useScheduleSync } from "./data/useScheduleSync";
import type { CalendarEvent, TaskOccurrenceOverride } from "./types";
import { TodayView, shiftIso } from "./TodayView";
import { TasksView } from "./TasksView";
import { WeekView } from "./WeekView";
import { seedState, STORAGE_KEY } from "./lib/storage";
import { withDuoDefaults } from "./lib/duo";
import { addDays, todayISO } from "./lib/dates";
import type { RepeatingTask, Tag } from "./types";
import { usePartnership } from "./partnership/PartnershipProvider";

type Tab = "today" | "week" | "tasks";

export default function App() {
  const auth = useAuth();
  const partnershipState = usePartnership();
  const schedule = useScheduleSync();
  const { state, setState } = schedule;
  const [date, setDate] = useState(todayISO);
  const [tab, setTab] = useState<Tab>("today");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editTaskRequested, setEditTaskRequested] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const today = todayISO();
  const partnership = partnershipState.partnership;
  const currentUserId =
    auth.user?.id ??
    partnership?.members.find((member) => member.role === partnership.currentRole)
      ?.profile.id ??
    "demo-you";
  const memberIds = partnership?.members.map((member) => member.profile.id) ?? [
    currentUserId,
  ];

  function runCloud(action: () => Promise<void>) {
    if (!schedule.cloudEnabled) return;
    void action().catch((error) =>
      setActionError(
        error instanceof Error ? error.message : "The shared schedule could not sync.",
      ),
    );
  }

  function prepareItem<T extends RepeatingTask | CalendarEvent>(item: T): T {
    if (!partnership) return item;
    return withDuoDefaults(item, {
      partnershipId: partnership.id,
      ownerId: currentUserId,
      memberIds,
      scope: "shared",
      visibility: "partner_visible",
      completionRule: "assigned",
      timezone:
        partnership.members.find((member) => member.profile.id === currentUserId)
          ?.profile.timezone,
    });
  }

  function toggleTask(taskId: string, completionDate: string) {
    setState((current) => {
      const exists = current.completions.some(
        (completion) =>
          completion.taskId === taskId &&
          completion.date === completionDate &&
          (!completion.userId || completion.userId === currentUserId),
      );
      runCloud(() =>
        setCloudCompletion(taskId, completionDate, currentUserId, !exists),
      );
      return {
        ...current,
        completions: exists
          ? current.completions.filter(
              (completion) =>
                !(
                  completion.taskId === taskId &&
                  completion.date === completionDate &&
                  (!completion.userId || completion.userId === currentUserId)
                ),
            )
          : [
              ...current.completions,
              { taskId, date: completionDate, userId: currentUserId },
            ],
      };
    });
  }

  function saveEvent(event: CalendarEvent) {
    const nextEvent = prepareItem(event);
    if (partnership) {
      runCloud(() =>
        upsertScheduleItem(nextEvent, partnership.id, currentUserId),
      );
    }
    setState((current) => ({
      ...current,
      events: [
        ...current.events.filter((entry) => entry.id !== nextEvent.id),
        nextEvent,
      ],
    }));
  }

  function toggleEvent(eventId: string) {
    setState((current) => {
      const event = current.events.find((entry) => entry.id === eventId);
      if (!event) return current;
      runCloud(() =>
        setCloudCompletion(eventId, event.date, currentUserId, !event.completed),
      );
      return {
        ...current,
        events: current.events.map((entry) =>
          entry.id === eventId
            ? { ...entry, completed: !entry.completed }
            : entry,
        ),
      };
    });
  }

  function saveTask(task: RepeatingTask) {
    const nextTask = prepareItem(task);
    if (partnership) {
      runCloud(() =>
        upsertScheduleItem(nextTask, partnership.id, currentUserId),
      );
    }
    setState((current) => ({
      ...current,
      tasks: [
        ...current.tasks.filter((entry) => entry.id !== nextTask.id),
        nextTask,
      ],
    }));
  }

  function saveOccurrenceOverride(override: TaskOccurrenceOverride) {
    runCloud(() => upsertCloudOverride(override, currentUserId));
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
    runCloud(() => deleteCloudOverride(taskId, originalDate));
    setState((current) => ({
      ...current,
      occurrenceOverrides: current.occurrenceOverrides.filter(
        (entry) => !(entry.taskId === taskId && entry.originalDate === originalDate),
      ),
    }));
  }

  function skipOccurrence(taskId: string, originalDate: string) {
    setState((current) => {
      const nextTasks = current.tasks.map((task) =>
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
      );
      const updatedTask = nextTasks.find((task) => task.id === taskId);
      if (updatedTask && partnership) {
        runCloud(() =>
          upsertScheduleItem(updatedTask, partnership.id, currentUserId),
        );
      }
      runCloud(() => deleteCloudOverride(taskId, originalDate));
      return {
        ...current,
        tasks: nextTasks,
        occurrenceOverrides: current.occurrenceOverrides.filter(
          (entry) =>
            !(entry.taskId === taskId && entry.originalDate === originalDate),
        ),
      };
    });
  }

  function addTag(tag: Tag) {
    if (partnership) {
      runCloud(() =>
        upsertCloudTag(tag, partnership.id, currentUserId),
      );
    }
    setState((current) =>
      current.tags.some(
        (existing) => existing.name.toLowerCase() === tag.name.toLowerCase(),
      )
        ? current
        : { ...current, tags: [...current.tags, tag] },
    );
  }

  function updateTag(tagId: string, patch: Partial<Pick<Tag, "name" | "color">>) {
    setState((current) => {
      const nextTags = current.tags.map((tag) =>
        tag.id === tagId ? { ...tag, ...patch } : tag,
      );
      const updated = nextTags.find((tag) => tag.id === tagId);
      if (updated && partnership) {
        runCloud(() =>
          upsertCloudTag(updated, partnership.id, currentUserId),
        );
      }
      return { ...current, tags: nextTags };
    });
  }

  function deleteTag(tagId: string) {
    runCloud(() => deleteCloudTag(tagId));
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

      {(schedule.loading || schedule.error || actionError || partnershipState.error) && (
        <div
          className={`sync-banner${
            schedule.error || actionError || partnershipState.error ? " error" : ""
          }`}
          role="status"
        >
          {schedule.loading
            ? "Syncing your shared day…"
            : schedule.error || actionError || partnershipState.error}
        </div>
      )}

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
          onDeleteEvent={(eventId) => {
            runCloud(() => deleteScheduleItem(eventId));
            setState((current) => ({
              ...current,
              events: current.events.filter((event) => event.id !== eventId),
            }));
          }}
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
          onDeleteTask={(taskId) => {
            runCloud(() => deleteScheduleItem(taskId));
            setState((current) => ({
              ...current,
              tasks: current.tasks.filter((task) => task.id !== taskId),
              occurrenceOverrides: current.occurrenceOverrides.filter(
                (override) => override.taskId !== taskId,
              ),
            }));
          }}
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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { SettingsView } from "./SettingsView";
import { IncomingInviteBanner } from "./IncomingInviteBanner";
import { seedState, STORAGE_KEY } from "./lib/storage";
import { withDuoDefaults } from "./lib/duo";
import { addDays, todayISO } from "./lib/dates";
import type { RepeatingTask, Tag } from "./types";
import { usePartnership } from "./partnership/PartnershipProvider";

type Tab = "today" | "week" | "tasks" | "settings";

export default function App() {
  const auth = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (
      auth.user &&
      !auth.demoMode &&
      !partnershipState.loading &&
      !partnership
    ) {
      setTab("settings");
    }
  }, [
    auth.demoMode,
    auth.user,
    partnership,
    partnershipState.loading,
  ]);

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
      const exists = current.completions.some(
        (completion) =>
          completion.taskId === eventId &&
          completion.date === event.date &&
          completion.userId === currentUserId,
      );
      runCloud(() =>
        setCloudCompletion(eventId, event.date, currentUserId, !exists),
      );
      return {
        ...current,
        events: current.events.map((entry) =>
          entry.id === eventId
            ? { ...entry, completed: !exists }
            : entry,
        ),
        completions: exists
          ? current.completions.filter(
              (completion) =>
                !(
                  completion.taskId === eventId &&
                  completion.date === event.date &&
                  completion.userId === currentUserId
                ),
            )
          : [
              ...current.completions,
              { taskId: eventId, date: event.date, userId: currentUserId },
            ],
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
    <div className="duo-app-shell">
      <header className="app-header app-sidebar">
        <div className="app-brand">
          <h1>Pellia</h1>
          <span>{partnership?.name ?? "Your space"}</span>
        </div>
        <nav className="nav app-nav">
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
          <button
            className={tab === "settings" ? "active" : ""}
            type="button"
            onClick={() => setTab("settings")}
          >
            Settings
          </button>
        </nav>
        <button
          className="ghost sign-out-button"
          type="button"
          onClick={() => {
            void auth.signOut().then(() => navigate("/", { replace: true }));
          }}
        >
          Sign out
        </button>
        <div className="sidebar-members" aria-label="Partnership members">
          {partnership?.members.map((member) => (
            <span
              title={member.profile.displayName}
              key={member.profile.id}
              style={{ "--member-color": member.color } as React.CSSProperties}
            >
              {member.profile.displayName.slice(0, 1)}
            </span>
          ))}
        </div>
      </header>

      <main className="app-workspace">
      <IncomingInviteBanner />
      {(!schedule.online ||
        schedule.loading ||
        schedule.error ||
        actionError ||
        partnershipState.error) && (
        <div
          className={`sync-banner${
            schedule.error || actionError || partnershipState.error ? " error" : ""
          }`}
          role="status"
        >
          {!schedule.online
            ? "You are offline. Changes stay on this device until Pellia reconnects."
            : schedule.loading
            ? "Syncing your shared day…"
            : schedule.error || actionError || partnershipState.error}
        </div>
      )}

      {schedule.importAvailable && (
        <aside className="import-banner">
          <div>
            <strong>Bring your existing Pellia with you?</strong>
            <span>Your local items have not been uploaded.</span>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={() => void schedule.importLocal("personal")}
          >
            Import privately
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => void schedule.importLocal("shared")}
          >
            Import as shared
          </button>
        </aside>
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

      {tab === "settings" && (
        <SettingsView
          importAvailable={schedule.importAvailable}
          onImport={schedule.importLocal}
          onResetDemo={() => {
            localStorage.removeItem(STORAGE_KEY);
            setState(seedState());
            setSelectedTagId(null);
          }}
        />
      )}
      </main>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {(["today", "week", "tasks", "settings"] as Tab[]).map((entry) => (
          <button
            className={tab === entry ? "active" : ""}
            type="button"
            key={entry}
            onClick={() => {
              if (entry === "tasks") setEditTaskRequested(null);
              setTab(entry);
            }}
          >
            <span aria-hidden="true">
              {entry === "today"
                ? "●"
                : entry === "week"
                  ? "▦"
                  : entry === "tasks"
                    ? "✓"
                    : "⚙"}
            </span>
            {entry[0].toUpperCase() + entry.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  );
}

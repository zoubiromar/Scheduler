import { useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import {
  completionState,
  itemLane,
  type DuoLane,
} from "./lib/duo";
import { formatTime } from "./lib/dates";
import type { ResolvedTaskOccurrence } from "./lib/occurrences";
import { usePartnership } from "./partnership/PartnershipProvider";
import { TagPill } from "./TasksView";
import type { AppState, CalendarEvent, DuoItemFields } from "./types";

interface DuoTodayBoardProps {
  state: AppState;
  occurrences: ResolvedTaskOccurrence[];
  events: CalendarEvent[];
  onToggleTask: (taskId: string, date: string) => void;
  onToggleEvent: (eventId: string) => void;
  onEditOccurrence: (key: string) => void;
  onEditEvent: (eventId: string) => void;
}

interface DayItem extends DuoItemFields {
  id: string;
  key: string;
  sourceId: string;
  completionDate: string;
  kind: "task" | "event";
  title: string;
  notes?: string;
  startTime?: string;
  durationMinutes?: number;
  tagIds: string[];
}

export function DuoTodayBoard({
  state,
  occurrences,
  events,
  onToggleTask,
  onToggleEvent,
  onEditOccurrence,
  onEditEvent,
}: DuoTodayBoardProps) {
  const auth = useAuth();
  const { partnership } = usePartnership();
  const [mobileLane, setMobileLane] = useState<DuoLane>("shared");

  const currentUserId =
    auth.user?.id ??
    partnership?.members.find((member) => member.role === partnership.currentRole)
      ?.profile.id ??
    "demo-you";
  const members = partnership?.members ?? [];
  const partner = members.find((member) => member.profile.id !== currentUserId);
  const memberIds = members.map((member) => member.profile.id);

  const items = useMemo<DayItem[]>(
    () => [
      ...occurrences.map((occurrence) => ({
        ...occurrence,
        id: occurrence.taskId,
        kind: "task" as const,
        sourceId: occurrence.taskId,
        completionDate: occurrence.originalDate,
      })),
      ...events.map((event) => ({
        ...event,
        key: `event:${event.id}`,
        kind: "event" as const,
        sourceId: event.id,
        completionDate: event.date,
      })),
    ],
    [events, occurrences],
  );

  const lanes: Record<DuoLane, DayItem[]> = {
    mine: [],
    shared: [],
    partner: [],
  };
  for (const item of items) lanes[itemLane(item, currentUserId)].push(item);
  for (const lane of Object.values(lanes)) {
    lane.sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return 1;
      if (b.startTime) return -1;
      return a.title.localeCompare(b.title);
    });
  }

  const progress = (lane: DuoLane) => {
    const laneItems = lanes[lane];
    const done = laneItems.filter(
      (item) =>
        completionState(item, item.completionDate, state.completions, memberIds)
          .done,
    ).length;
    return { done, total: laneItems.length };
  };

  const renderLane = (
    lane: DuoLane,
    label: string,
    color: string,
  ) => {
    const laneProgress = progress(lane);
    return (
      <section
        className={`duo-lane duo-lane-${lane}${
          mobileLane === lane ? " mobile-active" : ""
        }`}
        style={{ "--member-color": color } as React.CSSProperties}
      >
        <header className="duo-lane-header">
          <div>
            <span className="member-dot" />
            <strong>{label}</strong>
          </div>
          <span>{laneProgress.done}/{laneProgress.total}</span>
        </header>
        {lanes[lane].length === 0 ? (
          <p className="empty">Nothing planned.</p>
        ) : (
          lanes[lane].map((item) => {
            const status = completionState(
              item,
              item.completionDate,
              state.completions,
              memberIds,
            );
            const canAct =
              lane === "shared" ||
              lane === "mine" ||
              item.assigneeIds?.includes(currentUserId);
            const checked = status.completedUserIds.includes(currentUserId);
            return (
              <article
                className={`duo-task-card${status.done ? " completed" : ""}`}
                key={item.key}
              >
                <button
                  className={`check${checked ? " on" : ""}`}
                  type="button"
                  disabled={!canAct}
                  aria-label={`Mark ${item.title} ${checked ? "incomplete" : "complete"}`}
                  onClick={() =>
                    item.kind === "task"
                      ? onToggleTask(item.sourceId, item.completionDate)
                      : onToggleEvent(item.sourceId)
                  }
                />
                <div className="duo-task-content">
                  <div className="duo-task-title">
                    {item.startTime && <time>{formatTime(item.startTime)}</time>}
                    <strong>{item.title}</strong>
                  </div>
                  {item.notes && <span className="meta">{item.notes}</span>}
                  <div className="duo-card-meta">
                    {item.completionRule === "both" && (
                      <span className="completion-avatars">
                        {members.map((member) => (
                          <i
                            className={
                              status.completedUserIds.includes(member.profile.id)
                                ? "done"
                                : ""
                            }
                            title={`${member.profile.displayName}: ${
                              status.completedUserIds.includes(member.profile.id)
                                ? "done"
                                : "not done"
                            }`}
                            key={member.profile.id}
                            style={
                              { "--member-color": member.color } as React.CSSProperties
                            }
                          >
                            {member.profile.displayName.slice(0, 1)}
                          </i>
                        ))}
                      </span>
                    )}
                    {item.tagIds.map((tagId) => {
                      const tag = state.tags.find((entry) => entry.id === tagId);
                      return tag ? <TagPill tag={tag} key={tag.id} /> : null;
                    })}
                  </div>
                </div>
                {canAct && (
                  <button
                    className="ghost compact-action"
                    type="button"
                    onClick={() =>
                      item.kind === "task"
                        ? onEditOccurrence(item.key)
                        : onEditEvent(item.sourceId)
                    }
                  >
                    Edit
                  </button>
                )}
              </article>
            );
          })
        )}
      </section>
    );
  };

  return (
    <>
      <div className="duo-mobile-segments" aria-label="Whose day">
        {(["mine", "shared", "partner"] as DuoLane[]).map((lane) => (
          <button
            className={mobileLane === lane ? "active" : ""}
            type="button"
            key={lane}
            onClick={() => setMobileLane(lane)}
          >
            {lane === "mine"
              ? "You"
              : lane === "shared"
                ? "Together"
                : partner?.profile.displayName ?? "Partner"}
          </button>
        ))}
      </div>
      <div className="duo-day-board">
        {renderLane(
          "shared",
          "Together",
          "color-mix(in srgb, var(--sage) 70%, var(--coral))",
        )}
        <div className="duo-personal-columns">
          {renderLane(
            "mine",
            "You",
            members.find((member) => member.profile.id === currentUserId)?.color ??
              "#3f6b58",
          )}
          {renderLane(
            "partner",
            partner?.profile.displayName ?? "Partner",
            partner?.color ?? "#c45c3e",
          )}
        </div>
      </div>
    </>
  );
}

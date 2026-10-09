import { useAuth } from "./auth/AuthProvider";
import { completionState, itemLane, type DuoLane } from "./lib/duo";
import {
  addDays,
  formatTime,
  formatWeekdayLabel,
  minutesFromTime,
  startOfWeekMonday,
  todayISO,
} from "./lib/dates";
import { resolveTaskOccurrences } from "./lib/occurrences";
import { usePartnership } from "./partnership/PartnershipProvider";
import { TagFilter } from "./TagFilter";
import type { AppState, DuoItemFields } from "./types";

const DAY_START = 7 * 60;
const DAY_END = 24 * 60;
const DAY_SPAN = DAY_END - DAY_START;

interface WeekViewProps {
  date: string;
  state: AppState;
  selectedTagId: string | null;
  onFilterChange: (tagId: string | null) => void;
  onToggleTask: (taskId: string, date: string) => void;
  onToggleEvent: (eventId: string) => void;
  onShiftWeek: (delta: number) => void;
  onSelectDate: (iso: string) => void;
}

interface WeekItem extends DuoItemFields {
  id: string;
  sourceId: string;
  completionDate: string;
  kind: "task" | "event";
  title: string;
  startTime?: string;
  duration: number;
  tagIds: string[];
  duoLane: DuoLane;
  overlapLane: number;
  completed: boolean;
  checked: boolean;
}

function assignOverlapLanes(
  items: Omit<WeekItem, "overlapLane">[],
): WeekItem[] {
  const byGroup = new Map<DuoLane, number[]>();
  return [...items]
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
    .map((item) => {
      const laneEnds = byGroup.get(item.duoLane) ?? [];
      const start = item.startTime ? minutesFromTime(item.startTime) : 0;
      let overlapLane = laneEnds.findIndex((end) => end <= start);
      if (overlapLane === -1) overlapLane = laneEnds.length;
      laneEnds[overlapLane] = start + item.duration;
      byGroup.set(item.duoLane, laneEnds);
      return { ...item, overlapLane };
    });
}

export function WeekView({
  date,
  state,
  selectedTagId,
  onFilterChange,
  onToggleTask,
  onToggleEvent,
  onShiftWeek,
  onSelectDate,
}: WeekViewProps) {
  const auth = useAuth();
  const { partnership } = usePartnership();
  const start = startOfWeekMonday(date);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const today = todayISO();
  const currentUserId =
    auth.user?.id ??
    partnership?.members.find((member) => member.role === partnership.currentRole)
      ?.profile.id ??
    "demo-you";
  const memberIds = partnership?.members.map((member) => member.profile.id) ?? [
    currentUserId,
  ];
  const partner = partnership?.members.find(
    (member) => member.profile.id !== currentUserId,
  );
  const laneLabels: Record<DuoLane, string> = {
    mine: "You",
    shared: "Together",
    partner: partner?.profile.displayName ?? "Partner",
  };

  return (
    <div className="week-view duo-week-view">
      <div className="week-toolbar">
        <button
          className="icon-button"
          type="button"
          aria-label="Previous week"
          onClick={() => onShiftWeek(-1)}
        >
          ←
        </button>
        <strong>{start} — {days[6]}</strong>
        <button
          className="icon-button"
          type="button"
          aria-label="Next week"
          onClick={() => onShiftWeek(1)}
        >
          →
        </button>
      </div>
      <TagFilter
        tags={state.tags}
        selectedId={selectedTagId}
        onChange={onFilterChange}
      />
      <div className="week-hours" aria-hidden="true">
        <span>7am</span>
        <span>11am</span>
        <span>3pm</span>
        <span>8pm</span>
        <span>12am</span>
      </div>

      <div className="week-stack">
        {days.map((iso) => {
          const occurrences = resolveTaskOccurrences(
            state.tasks,
            state.occurrenceOverrides,
            iso,
          ).filter(
            (occurrence) =>
              selectedTagId === null || occurrence.tagIds.includes(selectedTagId),
          );
          const events = state.events.filter(
            (event) =>
              event.date === iso &&
              (selectedTagId === null || event.tagIds.includes(selectedTagId)),
          );

          const rawItems: Array<Omit<WeekItem, "overlapLane">> = [
            ...occurrences.map((occurrence) => {
              const status = completionState(
                { ...occurrence, id: occurrence.taskId },
                occurrence.originalDate,
                state.completions,
                memberIds,
              );
              return {
                ...occurrence,
                id: `task:${occurrence.key}`,
                sourceId: occurrence.taskId,
                completionDate: occurrence.originalDate,
                kind: "task" as const,
                duration: occurrence.durationMinutes ?? 30,
                duoLane: itemLane(occurrence, currentUserId),
                completed: status.done,
                checked: status.completedUserIds.includes(currentUserId),
              };
            }),
            ...events.map((event) => {
              const status = completionState(
                event,
                event.date,
                state.completions,
                memberIds,
              );
              return {
                ...event,
                id: `event:${event.id}`,
                sourceId: event.id,
                completionDate: event.date,
                kind: "event" as const,
                duration: event.durationMinutes ?? 30,
                duoLane: itemLane(event, currentUserId),
                completed: status.done || Boolean(event.completed),
                checked:
                  status.completedUserIds.includes(currentUserId) ||
                  Boolean(event.completed),
              };
            }),
          ];
          const timed = assignOverlapLanes(
            rawItems.filter((item) => item.startTime),
          );
          const inBar = timed.filter((item) => {
            const itemStart = minutesFromTime(item.startTime!);
            return itemStart >= DAY_START && itemStart + item.duration <= DAY_END;
          });
          const sideItems = [
            ...rawItems.filter((item) => !item.startTime),
            ...timed.filter((item) => !inBar.includes(item)),
          ];

          const laneCounts: Record<DuoLane, number> = {
            mine: Math.max(
              1,
              ...inBar
                .filter((item) => item.duoLane === "mine")
                .map((item) => item.overlapLane + 1),
            ),
            shared: Math.max(
              1,
              ...inBar
                .filter((item) => item.duoLane === "shared")
                .map((item) => item.overlapLane + 1),
            ),
            partner: Math.max(
              1,
              ...inBar
                .filter((item) => item.duoLane === "partner")
                .map((item) => item.overlapLane + 1),
            ),
          };
          const laneOffsets: Record<DuoLane, number> = {
            mine: 0,
            shared: laneCounts.mine,
            partner: laneCounts.mine + laneCounts.shared,
          };
          const totalLanes =
            laneCounts.mine + laneCounts.shared + laneCounts.partner;

          const toggle = (item: WeekItem) =>
            item.kind === "task"
              ? onToggleTask(item.sourceId, item.completionDate)
              : onToggleEvent(item.sourceId);

          return (
            <article
              className={`week-row duo-week-row${iso === today ? " today" : ""}`}
              key={iso}
            >
              <button
                className="day-label"
                type="button"
                onClick={() => onSelectDate(iso)}
              >
                <strong>{formatWeekdayLabel(iso)}</strong>
                <span>{iso.slice(5)}</span>
              </button>

              <div className="day-schedule duo-day-schedule">
                <div
                  className="timeline-bar duo-timeline-bar"
                  style={{ "--lanes": totalLanes } as React.CSSProperties}
                >
                  <div className="time-guides" aria-hidden="true" />
                  <div className="duo-lane-guides" aria-hidden="true">
                    <span>{laneLabels.mine}</span>
                    <span>{laneLabels.shared}</span>
                    <span>{laneLabels.partner}</span>
                  </div>
                  {inBar.map((item) => {
                    const itemStart = minutesFromTime(item.startTime!);
                    const left = ((itemStart - DAY_START) / DAY_SPAN) * 100;
                    const width = Math.max((item.duration / DAY_SPAN) * 100, 2);
                    const color =
                      item.duoLane === "shared"
                        ? "#7067a8"
                        : partnership?.members.find(
                            (member) =>
                              member.profile.id ===
                              (item.ownerId ?? currentUserId),
                          )?.color ?? "#6b6258";
                    return (
                      <div
                        className={`timeline-item duo-timeline-item lane-${item.duoLane}${
                          item.completed ? " completed" : ""
                        }`}
                        key={item.id}
                        tabIndex={0}
                        title={`${laneLabels[item.duoLane]} · ${formatTime(item.startTime!)} · ${item.title}`}
                        style={
                          {
                            left: `${left}%`,
                            width: `${Math.min(width, 100 - left)}%`,
                            top: `${
                              (laneOffsets[item.duoLane] + item.overlapLane) * 34 +
                              5
                            }px`,
                            "--tag-color": color,
                          } as React.CSSProperties
                        }
                      >
                        <strong>{item.title}</strong>
                        <span className="timeline-tooltip" role="tooltip">
                          <strong>{item.title}</strong>
                          <span>
                            {laneLabels[item.duoLane]} · {formatTime(item.startTime!)} ·{" "}
                            {item.duration} min
                          </span>
                          <label>
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggle(item)}
                            />
                            Completed by you
                          </label>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="untimed-column duo-side-column">
                {(["shared", "mine", "partner"] as DuoLane[]).map((lane) => {
                  const grouped = sideItems.filter((item) => item.duoLane === lane);
                  if (grouped.length === 0) return null;
                  return (
                    <div className="side-group" key={lane}>
                      <strong>{laneLabels[lane]}</strong>
                      {grouped.map((item) => (
                        <label
                          className={`mini-task${item.completed ? " done" : ""}`}
                          key={item.id}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggle(item as WeekItem)}
                          />
                          <span>
                            {item.startTime && `${formatTime(item.startTime)} · `}
                            {item.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })}
                {sideItems.length === 0 && (
                  <span className="empty small">No anytime or edge items</span>
                )}
              </aside>
            </article>
          );
        })}
      </div>
    </div>
  );
}

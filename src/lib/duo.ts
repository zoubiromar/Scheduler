import type {
  CalendarEvent,
  CompletionRule,
  DuoItemFields,
  ItemScope,
  ItemVisibility,
  RepeatingTask,
  TaskCompletion,
} from "../types";

export type ScheduleItem = RepeatingTask | CalendarEvent;
export type DuoLane = "mine" | "shared" | "partner";

export interface DuoDefaults {
  partnershipId: string;
  ownerId: string;
  memberIds: string[];
  scope?: ItemScope;
  visibility?: ItemVisibility;
  completionRule?: CompletionRule;
  timezone?: string;
}

export function withDuoDefaults<T extends ScheduleItem>(
  item: T,
  defaults: DuoDefaults,
): T {
  const scope = item.scope ?? defaults.scope ?? "shared";
  const completionRule =
    item.completionRule ?? defaults.completionRule ?? "assigned";
  return {
    ...item,
    partnershipId: item.partnershipId ?? defaults.partnershipId,
    ownerId: item.ownerId ?? defaults.ownerId,
    scope,
    visibility:
      scope === "shared"
        ? "partner_visible"
        : item.visibility ?? defaults.visibility ?? "partner_visible",
    completionRule,
    assigneeIds:
      item.assigneeIds ??
      (scope === "shared" && completionRule === "both"
        ? defaults.memberIds
        : [defaults.ownerId]),
    anchorTimezone:
      item.anchorTimezone ??
      defaults.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function itemLane(
  item: DuoItemFields,
  currentUserId: string,
): DuoLane {
  if ((item.scope ?? "personal") === "shared") return "shared";
  if (!item.ownerId) return "mine";
  return item.ownerId === currentUserId ? "mine" : "partner";
}

export interface CompletionState {
  completedUserIds: string[];
  done: boolean;
}

export function completionState(
  item: Pick<DuoItemFields, "completionRule" | "assigneeIds"> & { id: string },
  occurrenceDate: string,
  completions: TaskCompletion[],
  partnershipMemberIds: string[],
): CompletionState {
  const completedUserIds = [
    ...new Set(
      completions
        .filter(
          (completion) =>
            completion.taskId === item.id &&
            completion.date === occurrenceDate &&
            completion.userId,
        )
        .map((completion) => completion.userId!),
    ),
  ];
  const rule = item.completionRule ?? "assigned";
  const required =
    rule === "both"
      ? partnershipMemberIds
      : item.assigneeIds?.length
        ? item.assigneeIds
        : partnershipMemberIds.slice(0, 1);

  return {
    completedUserIds,
    done:
      rule === "either"
        ? completedUserIds.length > 0
        : required.length > 0 &&
          required.every((userId) => completedUserIds.includes(userId)),
  };
}

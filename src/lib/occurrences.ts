import type { RepeatingTask, TaskOccurrenceOverride } from "../types";
import { occursOn } from "./recurrence";

export interface ResolvedTaskOccurrence {
  key: string;
  taskId: string;
  originalDate: string;
  date: string;
  title: string;
  notes?: string;
  startTime?: string;
  durationMinutes?: number;
  tagIds: string[];
  isOverride: boolean;
}

function overrideKey(override: Pick<TaskOccurrenceOverride, "taskId" | "originalDate">): string {
  return `${override.taskId}:${override.originalDate}`;
}

/**
 * Resolves the generated series and per-date changes into what should appear
 * on a calendar date. A moved override suppresses its original slot and can
 * coexist with a regular occurrence on its destination date.
 */
export function resolveTaskOccurrences(
  tasks: RepeatingTask[],
  overrides: TaskOccurrenceOverride[],
  date: string,
): ResolvedTaskOccurrence[] {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const overridesByOriginal = new Map<string, TaskOccurrenceOverride>();
  for (const override of overrides) {
    if (tasksById.has(override.taskId)) {
      overridesByOriginal.set(overrideKey(override), override);
    }
  }

  const generated: ResolvedTaskOccurrence[] = tasks
    .filter(
      (task) =>
        occursOn(task.recurrence, date) &&
        !overridesByOriginal.has(`${task.id}:${date}`),
    )
    .map((task) => ({
      key: `${task.id}:${date}`,
      taskId: task.id,
      originalDate: date,
      date,
      title: task.title,
      notes: task.notes,
      startTime: task.startTime,
      durationMinutes: task.durationMinutes,
      tagIds: task.tagIds,
      isOverride: false,
    }));

  const changed: ResolvedTaskOccurrence[] = [...overridesByOriginal.values()]
    .filter((override) => !override.cancelled && override.date === date)
    .map((override) => ({
      key: `${override.taskId}:${override.originalDate}`,
      taskId: override.taskId,
      originalDate: override.originalDate,
      date: override.date,
      title: override.title,
      notes: override.notes,
      startTime: override.startTime,
      durationMinutes: override.durationMinutes,
      tagIds: override.tagIds,
      isOverride: true,
    }));

  return [...generated, ...changed];
}

export function occurrenceToOverride(
  occurrence: ResolvedTaskOccurrence,
  patch: Partial<
    Pick<
      TaskOccurrenceOverride,
      "date" | "title" | "notes" | "startTime" | "durationMinutes" | "tagIds" | "cancelled"
    >
  > = {},
): TaskOccurrenceOverride {
  return {
    id: crypto.randomUUID(),
    taskId: occurrence.taskId,
    originalDate: occurrence.originalDate,
    date: occurrence.date,
    title: occurrence.title,
    notes: occurrence.notes,
    startTime: occurrence.startTime,
    durationMinutes: occurrence.durationMinutes,
    tagIds: occurrence.tagIds,
    ...patch,
  };
}

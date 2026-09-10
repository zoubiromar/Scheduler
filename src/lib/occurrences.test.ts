import { describe, expect, it } from "vitest";
import type { RepeatingTask, TaskOccurrenceOverride } from "../types";
import { resolveTaskOccurrences } from "./occurrences";

const task: RepeatingTask = {
  id: "monday-call",
  title: "Partner call",
  startTime: "09:00",
  durationMinutes: 30,
  tagIds: ["together"],
  recurrence: {
    kind: "weekdays",
    days: [1],
    startDate: "2026-09-01",
  },
};

function override(patch: Partial<TaskOccurrenceOverride> = {}): TaskOccurrenceOverride {
  return {
    id: "override-1",
    taskId: task.id,
    originalDate: "2026-09-14",
    date: "2026-09-14",
    title: "Partner call",
    startTime: "11:00",
    durationMinutes: 45,
    tagIds: ["together"],
    ...patch,
  };
}

describe("resolveTaskOccurrences", () => {
  it("replaces only the edited occurrence", () => {
    const edited = resolveTaskOccurrences([task], [override()], "2026-09-14");
    expect(edited).toMatchObject([
      {
        title: "Partner call",
        startTime: "11:00",
        durationMinutes: 45,
        isOverride: true,
      },
    ]);
    expect(resolveTaskOccurrences([task], [override()], "2026-09-21")[0]).toMatchObject({
      startTime: "09:00",
      durationMinutes: 30,
      isOverride: false,
    });
  });

  it("cancels one date without changing later dates", () => {
    expect(
      resolveTaskOccurrences([task], [override({ cancelled: true })], "2026-09-14"),
    ).toEqual([]);
    expect(resolveTaskOccurrences([task], [override({ cancelled: true })], "2026-09-21")).toHaveLength(1);
  });

  it("moves one occurrence and suppresses its original date", () => {
    const moved = override({ date: "2026-09-15" });
    expect(resolveTaskOccurrences([task], [moved], "2026-09-14")).toEqual([]);
    expect(resolveTaskOccurrences([task], [moved], "2026-09-15")[0]).toMatchObject({
      originalDate: "2026-09-14",
      date: "2026-09-15",
      isOverride: true,
    });
  });

  it("ignores overrides when their series is deleted", () => {
    expect(resolveTaskOccurrences([], [override()], "2026-09-14")).toEqual([]);
  });
});

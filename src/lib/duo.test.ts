import { describe, expect, it } from "vitest";
import type { RepeatingTask, TaskCompletion } from "../types";
import {
  completionState,
  itemLane,
  withDuoDefaults,
} from "./duo";

const task: RepeatingTask = {
  id: "task",
  title: "Plan the week",
  recurrence: {
    kind: "weekdays",
    days: [1],
    startDate: "2026-10-01",
  },
  tagIds: [],
};

describe("duo schedule semantics", () => {
  it("defaults new shared tasks to the owner for assigned completion", () => {
    expect(
      withDuoDefaults(task, {
        partnershipId: "duo",
        ownerId: "alex",
        memberIds: ["alex", "sam"],
      }),
    ).toMatchObject({
      partnershipId: "duo",
      ownerId: "alex",
      scope: "shared",
      visibility: "partner_visible",
      completionRule: "assigned",
      assigneeIds: ["alex"],
    });
  });

  it("places shared items once and personal items in their owner's lane", () => {
    expect(itemLane({ scope: "shared", ownerId: "alex" }, "alex")).toBe("shared");
    expect(itemLane({ scope: "personal", ownerId: "alex" }, "alex")).toBe("mine");
    expect(itemLane({ scope: "personal", ownerId: "sam" }, "alex")).toBe("partner");
  });

  it("supports either-partner and both-partners completion rules", () => {
    const completions: TaskCompletion[] = [
      { taskId: "task", date: "2026-10-12", userId: "alex" },
    ];
    expect(
      completionState(
        { id: "task", completionRule: "either", assigneeIds: ["alex", "sam"] },
        "2026-10-12",
        completions,
        ["alex", "sam"],
      ).done,
    ).toBe(true);
    expect(
      completionState(
        { id: "task", completionRule: "both", assigneeIds: ["alex", "sam"] },
        "2026-10-12",
        completions,
        ["alex", "sam"],
      ).done,
    ).toBe(false);
    expect(
      completionState(
        { id: "task", completionRule: "both", assigneeIds: ["alex", "sam"] },
        "2026-10-12",
        [...completions, { taskId: "task", date: "2026-10-12", userId: "sam" }],
        ["alex", "sam"],
      ).done,
    ).toBe(true);
  });
});

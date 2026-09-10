import { describe, expect, it } from "vitest";
import type { CalendarEvent, Recurrence, RepeatingTask } from "../types";
import { busyRangesOnDate, freeSlots } from "./availability";
import { occursOn, occurrencesInRange } from "./recurrence";

const weekdays: Recurrence = {
  kind: "weekdays",
  days: [1, 2, 3, 4, 5],
  startDate: "2026-09-07",
};

describe("occursOn", () => {
  it("matches selected calendar weekdays", () => {
    expect(occursOn(weekdays, "2026-09-07")).toBe(true);
    expect(occursOn(weekdays, "2026-09-10")).toBe(true);
    expect(occursOn(weekdays, "2026-09-12")).toBe(false);
  });

  it("supports days 1, 4, and 5 of a six-day loop", () => {
    const rule: Recurrence = {
      kind: "cycle",
      length: 6,
      active: [0, 3, 4],
      startDate: "2026-09-01",
    };
    expect(occurrencesInRange(rule, "2026-09-01", "2026-09-12")).toEqual([
      "2026-09-01",
      "2026-09-04",
      "2026-09-05",
      "2026-09-07",
      "2026-09-10",
      "2026-09-11",
    ]);
  });

  it("honors start date, optional end date, and exceptions", () => {
    const rule: Recurrence = {
      kind: "cycle",
      length: 2,
      active: [0],
      startDate: "2026-09-03",
      endDate: "2026-09-08",
      exdates: ["2026-09-05"],
    };
    expect(occursOn(rule, "2026-09-01")).toBe(false);
    expect(occursOn(rule, "2026-09-03")).toBe(true);
    expect(occursOn(rule, "2026-09-05")).toBe(false);
    expect(occursOn(rule, "2026-09-07")).toBe(true);
    expect(occursOn(rule, "2026-09-09")).toBe(false);
  });

  it("supports an ongoing cycle without an end date", () => {
    const rule: Recurrence = {
      kind: "cycle",
      length: 3,
      active: [1],
      startDate: "2026-01-01",
    };
    expect(occursOn(rule, "2026-01-02")).toBe(true);
    expect(occursOn(rule, "2027-01-03")).toBe(true);
  });

  it("does not emit dates before a future start", () => {
    const rule: Recurrence = {
      kind: "weekdays",
      days: [1, 4],
      startDate: "2026-09-10",
    };
    expect(occurrencesInRange(rule, "2026-09-01", "2026-09-14")).toEqual([
      "2026-09-10",
      "2026-09-14",
    ]);
  });

  it("allows a weekday rule with no selected days", () => {
    const rule: Recurrence = {
      kind: "weekdays",
      days: [],
      startDate: "2026-09-01",
    };
    expect(occurrencesInRange(rule, "2026-09-01", "2026-09-30")).toEqual([]);
  });

  it("keeps cycle positions anchored to the start date", () => {
    const rule: Recurrence = {
      kind: "cycle",
      length: 6,
      active: [0],
      startDate: "2026-09-03",
    };
    expect(occursOn(rule, "2026-09-03")).toBe(true);
    expect(occursOn(rule, "2026-09-08")).toBe(false);
    expect(occursOn(rule, "2026-09-09")).toBe(true);
  });
});

describe("availability", () => {
  const gym: RepeatingTask = {
    id: "gym",
    title: "Gym",
    startTime: "07:00",
    durationMinutes: 60,
    recurrence: weekdays,
    tagIds: [],
  };

  it("treats timed routines and events as busy", () => {
    const events: CalendarEvent[] = [
      {
        id: "e1",
        title: "Deep work",
        date: "2026-09-08",
        startTime: "10:00",
        durationMinutes: 90,
        source: "manual",
        tagIds: [],
      },
    ];
    const busy = busyRangesOnDate("2026-09-08", [gym], events);
    expect(busy).toEqual([
      { startMinutes: 7 * 60, endMinutes: 8 * 60 },
      { startMinutes: 10 * 60, endMinutes: 11 * 60 + 30 },
    ]);
  });

  it("snaps free slots around busy time with buffer", () => {
    const slots = freeSlots({
      window: { startMinutes: 9 * 60, endMinutes: 12 * 60 },
      busy: [{ startMinutes: 10 * 60, endMinutes: 11 * 60 }],
      durationMinutes: 30,
      bufferMinutes: 30,
    });
    expect(slots).toEqual([
      { startMinutes: 9 * 60, endMinutes: 9 * 60 + 30 },
      { startMinutes: 11 * 60 + 30, endMinutes: 12 * 60 },
    ]);
  });
});

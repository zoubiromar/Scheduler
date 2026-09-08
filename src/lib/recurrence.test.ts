import { describe, expect, it } from "vitest";
import { occursOn, occurrencesInRange } from "./recurrence";
import type { RecurrenceRule } from "../types";
import { busyRangesOnDate, freeSlots } from "./availability";
import type { CalendarEvent, Routine } from "../types";

const weekdays: RecurrenceRule = {
  frequency: "weekly",
  interval: 1,
  byWeekday: [1, 2, 3, 4, 5],
  startDate: "2026-09-07",
};

describe("occursOn", () => {
  it("matches daily interval", () => {
    const rule: RecurrenceRule = {
      frequency: "daily",
      interval: 2,
      startDate: "2026-09-01",
    };
    expect(occursOn(rule, "2026-09-01")).toBe(true);
    expect(occursOn(rule, "2026-09-02")).toBe(false);
    expect(occursOn(rule, "2026-09-03")).toBe(true);
    expect(occursOn(rule, "2026-08-31")).toBe(false);
  });

  it("matches weekdays only", () => {
    expect(occursOn(weekdays, "2026-09-07")).toBe(true);
    expect(occursOn(weekdays, "2026-09-08")).toBe(true);
    expect(occursOn(weekdays, "2026-09-12")).toBe(false);
    expect(occursOn(weekdays, "2026-09-13")).toBe(false);
  });

  it("honors every-two-weeks", () => {
    const rule: RecurrenceRule = {
      frequency: "weekly",
      interval: 2,
      byWeekday: [1],
      startDate: "2026-09-07",
    };
    expect(occursOn(rule, "2026-09-07")).toBe(true);
    expect(occursOn(rule, "2026-09-14")).toBe(false);
    expect(occursOn(rule, "2026-09-21")).toBe(true);
  });

  it("skips exdates", () => {
    const rule: RecurrenceRule = { ...weekdays, exdates: ["2026-09-08"] };
    expect(occursOn(rule, "2026-09-08")).toBe(false);
    expect(occursOn(rule, "2026-09-09")).toBe(true);
  });

  it("stops after count", () => {
    const rule: RecurrenceRule = {
      frequency: "daily",
      interval: 1,
      startDate: "2026-09-01",
      count: 3,
    };
    expect(occursOn(rule, "2026-09-03")).toBe(true);
    expect(occursOn(rule, "2026-09-04")).toBe(false);
  });

  it("respects endDate", () => {
    const rule: RecurrenceRule = {
      frequency: "daily",
      interval: 1,
      startDate: "2026-09-01",
      endDate: "2026-09-02",
    };
    expect(occursOn(rule, "2026-09-02")).toBe(true);
    expect(occursOn(rule, "2026-09-03")).toBe(false);
  });
});

describe("occurrencesInRange", () => {
  it("lists weekday gym sessions in a week", () => {
    const dates = occurrencesInRange(weekdays, "2026-09-07", "2026-09-13");
    expect(dates).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]);
  });
});

describe("availability", () => {
  const gym: Routine = {
    id: "gym",
    title: "Gym",
    startTime: "07:00",
    durationMinutes: 60,
    recurrence: weekdays,
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

import type {
  CalendarEvent,
  RepeatingTask,
  TaskOccurrenceOverride,
  TimeRange,
} from "../types";
import { minutesFromTime, timeFromMinutes, weekdayOf } from "./dates";
import { resolveTaskOccurrences } from "./occurrences";

export function busyRangesOnDate(
  date: string,
  tasks: RepeatingTask[],
  events: CalendarEvent[],
  overrides: TaskOccurrenceOverride[] = [],
): TimeRange[] {
  const ranges: TimeRange[] = [];

  for (const occurrence of resolveTaskOccurrences(tasks, overrides, date)) {
    if (!occurrence.startTime || occurrence.durationMinutes == null) continue;
    const start = minutesFromTime(occurrence.startTime);
    ranges.push({ startMinutes: start, endMinutes: start + occurrence.durationMinutes });
  }

  for (const event of events) {
    if (event.date !== date || !event.startTime || event.durationMinutes == null) continue;
    const start = minutesFromTime(event.startTime);
    ranges.push({ startMinutes: start, endMinutes: start + event.durationMinutes });
  }

  return mergeRanges(ranges);
}

export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = [...ranges].sort((a, b) => a.startMinutes - b.startMinutes);
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.startMinutes > last.endMinutes) {
      merged.push({ ...range });
    } else {
      last.endMinutes = Math.max(last.endMinutes, range.endMinutes);
    }
  }
  return merged;
}

export function applyBuffer(ranges: TimeRange[], bufferMinutes: number): TimeRange[] {
  if (bufferMinutes <= 0) return ranges;
  return mergeRanges(
    ranges.map((range) => ({
      startMinutes: Math.max(0, range.startMinutes - bufferMinutes),
      endMinutes: Math.min(24 * 60, range.endMinutes + bufferMinutes),
    })),
  );
}

export function freeSlots(options: {
  window: TimeRange;
  busy: TimeRange[];
  durationMinutes: number;
  bufferMinutes?: number;
}): TimeRange[] {
  const busy = applyBuffer(options.busy, options.bufferMinutes ?? 0);
  const gaps: TimeRange[] = [];
  let cursor = options.window.startMinutes;

  for (const block of busy) {
    if (block.endMinutes <= options.window.startMinutes) continue;
    if (block.startMinutes >= options.window.endMinutes) break;
    const gapEnd = Math.min(block.startMinutes, options.window.endMinutes);
    if (gapEnd - cursor >= options.durationMinutes) {
      gaps.push({ startMinutes: cursor, endMinutes: gapEnd });
    }
    cursor = Math.max(cursor, block.endMinutes);
  }

  if (options.window.endMinutes - cursor >= options.durationMinutes) {
    gaps.push({ startMinutes: cursor, endMinutes: options.window.endMinutes });
  }

  const slots: TimeRange[] = [];
  for (const gap of gaps) {
    for (
      let start = gap.startMinutes;
      start + options.durationMinutes <= gap.endMinutes;
      start += options.durationMinutes
    ) {
      slots.push({
        startMinutes: start,
        endMinutes: start + options.durationMinutes,
      });
    }
  }
  return slots;
}

export function formatSlot(range: TimeRange): string {
  return `${timeFromMinutes(range.startMinutes)}–${timeFromMinutes(range.endMinutes)}`;
}

export function weekdayWindow(
  weeklyHours: { weekday: number; startTime: string; endTime: string }[],
  date: string,
): TimeRange | null {
  const day = weekdayOf(date);
  const match = weeklyHours.find((window) => window.weekday === day);
  if (!match) return null;
  return {
    startMinutes: minutesFromTime(match.startTime),
    endMinutes: minutesFromTime(match.endTime),
  };
}

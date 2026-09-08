import type { RecurrenceRule, Weekday } from "../types";
import { addDays, parseISODate, weekdayOf } from "./dates";

function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000);
}

function matchesCadence(rule: RecurrenceRule, date: string): boolean {
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  if (rule.exdates?.includes(date)) return false;

  const interval = Math.max(1, rule.interval);

  if (rule.frequency === "daily") {
    const diff = daysBetween(rule.startDate, date);
    return diff >= 0 && diff % interval === 0;
  }

  const weekdays = rule.byWeekday ?? [];
  if (!weekdays.includes(weekdayOf(date) as Weekday)) return false;
  const weekIndex = Math.floor(daysBetween(rule.startDate, date) / 7);
  return weekIndex >= 0 && weekIndex % interval === 0;
}

function occurrenceIndex(rule: RecurrenceRule, date: string): number | null {
  if (!matchesCadence(rule, date)) return null;
  let index = 0;
  for (let cursor = rule.startDate; cursor <= date; cursor = addDays(cursor, 1)) {
    if (matchesCadence(rule, cursor)) {
      index += 1;
      if (cursor === date) return index;
    }
  }
  return null;
}

export function occursOn(rule: RecurrenceRule, date: string): boolean {
  const index = occurrenceIndex(rule, date);
  if (index == null) return false;
  if (rule.count != null && index > rule.count) return false;
  return true;
}

export function occurrencesInRange(
  rule: RecurrenceRule,
  from: string,
  to: string,
): string[] {
  const dates: string[] = [];
  const start = from < rule.startDate ? rule.startDate : from;
  for (let cursor = start; cursor <= to; cursor = addDays(cursor, 1)) {
    if (occursOn(rule, cursor)) dates.push(cursor);
  }
  return dates;
}

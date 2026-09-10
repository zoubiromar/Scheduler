import type { Recurrence } from "../types";
import { addDays, parseISODate, weekdayOf } from "./dates";

export function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000);
}

export function occursOn(rule: Recurrence, date: string): boolean {
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  if (rule.exdates?.includes(date)) return false;

  if (rule.kind === "weekdays") {
    return rule.days.includes(weekdayOf(date) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  }

  const length = Math.max(1, rule.length);
  const position = daysBetween(rule.startDate, date) % length;
  return rule.active.includes(position);
}

export function occurrencesInRange(
  rule: Recurrence,
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

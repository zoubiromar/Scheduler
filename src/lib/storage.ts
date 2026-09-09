import type { AppState } from "../types";
import { todayISO } from "./dates";

export const STORAGE_KEY = "dayline.v1";

export const seedState = (): AppState => {
  const today = todayISO();
  return {
    routines: [
      {
      id: "routine-stretch",
      title: "Morning stretch",
      startTime: "07:00",
      durationMinutes: 20,
      recurrence: {
        frequency: "weekly",
        interval: 1,
        byWeekday: [1, 2, 3, 4, 5],
        startDate: "2026-01-05",
      },
    },
    {
      id: "routine-wind-down",
      title: "Evening wind-down",
      notes: "No fixed time — whenever the day ends",
      durationMinutes: 15,
      recurrence: {
        frequency: "daily",
        interval: 1,
        startDate: "2026-01-01",
      },
    },
    {
      id: "routine-sunday-reset",
      title: "Sunday reset",
      startTime: "10:00",
      durationMinutes: 90,
      recurrence: {
        frequency: "weekly",
        interval: 1,
        byWeekday: [0],
        startDate: "2026-01-04",
      },
    },
  ],
  completions: [],
  events: [
    {
      id: "event-deep-work",
      title: "Deep work block",
      date: today,
      startTime: "10:00",
      durationMinutes: 90,
      source: "manual",
    },
    {
      id: "event-dinner",
      title: "Dinner with Sam",
      date: today,
      startTime: "18:30",
      durationMinutes: 90,
      source: "booking",
    },
  ],
  checklist: {
    id: "daily-default",
    reset: "daily",
    items: [
      { id: "water", title: "Drink water" },
      { id: "inbox", title: "Inbox to zero" },
      { id: "walk", title: "Walk outside" },
    ],
  },
  dailyChecklists: [],
  goals: [
    {
      id: "goal-run",
      title: "Run 100 miles this quarter",
      horizon: "quarter",
      linkedRoutineIds: ["routine-stretch"],
    },
  ],
  bookingPage: {
    id: "booking-coffee",
    slug: "coffee",
    title: "Coffee with me",
    durationMinutes: 30,
    bufferMinutes: 15,
    minNoticeHours: 12,
    maxPerDay: 3,
    weeklyHours: [
      { weekday: 6, startTime: "10:00", endTime: "16:00" },
      { weekday: 0, startTime: "10:00", endTime: "14:00" },
    ],
  },
};
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.routines || !parsed.checklist) return seedState();
    return parsed;
  } catch {
    return seedState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

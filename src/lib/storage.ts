import type {
  AppState,
  CalendarEvent,
  Recurrence,
  RepeatingTask,
  Weekday,
} from "../types";
import { todayISO } from "./dates";

export const STORAGE_KEY = "dayline.v2";
const LEGACY_KEY = "dayline.v1";

export const seedState = (): AppState => {
  const today = todayISO();
  return {
    tags: [
      { id: "tag-personal", name: "Personal", color: "#c45c3e" },
      { id: "tag-focus", name: "Focus", color: "#3f6b58" },
    ],
    tasks: [
      {
        id: "task-stretch",
        title: "Morning stretch",
        startTime: "07:00",
        durationMinutes: 20,
        recurrence: {
          kind: "weekdays",
          days: [1, 2, 3, 4, 5],
          startDate: "2026-01-05",
        },
        tagIds: ["tag-personal"],
      },
      {
        id: "task-wind-down",
        title: "Evening wind-down",
        notes: "Whenever the day ends",
        durationMinutes: 15,
        recurrence: {
          kind: "cycle",
          length: 7,
          active: [0, 1, 2, 3, 4, 5, 6],
          startDate: "2026-01-01",
        },
        tagIds: ["tag-personal"],
      },
      {
        id: "task-sunday-reset",
        title: "Sunday reset",
        startTime: "10:00",
        durationMinutes: 90,
        recurrence: { kind: "weekdays", days: [0], startDate: "2026-01-04" },
        tagIds: ["tag-personal"],
      },
      ...["Drink water", "Inbox to zero", "Walk outside"].map(
        (title, index): RepeatingTask => ({
          id: `task-daily-${index}`,
          title,
          recurrence: {
            kind: "cycle",
            length: 7,
            active: [0, 1, 2, 3, 4, 5, 6],
            startDate: "2026-01-01",
          },
          tagIds: [],
        }),
      ),
      {
        id: "task-six-day-gym",
        title: "Gym strength",
        startTime: "17:30",
        durationMinutes: 60,
        recurrence: {
          kind: "cycle",
          length: 6,
          active: [0, 3, 4],
          startDate: today,
        },
        tagIds: ["tag-personal"],
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
        tagIds: ["tag-focus"],
      },
      {
        id: "event-dinner",
        title: "Dinner with Sam",
        date: today,
        startTime: "18:30",
        durationMinutes: 90,
        source: "booking",
        tagIds: ["tag-personal"],
      },
    ],
    goals: [
      {
        id: "goal-run",
        title: "Run 100 miles this quarter",
        horizon: "quarter",
        linkedTaskIds: ["task-stretch"],
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

interface LegacyRule {
  frequency: "daily" | "weekly";
  interval?: number;
  byWeekday?: Weekday[];
  startDate: string;
  endDate?: string;
  exdates?: string[];
}

interface LegacyState {
  routines?: Array<Omit<RepeatingTask, "recurrence" | "tagIds"> & { recurrence: LegacyRule }>;
  completions?: Array<{ routineId: string; date: string }>;
  events?: Array<Omit<CalendarEvent, "tagIds">>;
  checklist?: { items?: Array<{ id: string; title: string }> };
  dailyChecklists?: Array<{ date: string; doneItemIds: string[] }>;
  goals?: Array<{ id: string; title: string; horizon: "quarter" | "year"; linkedRoutineIds: string[] }>;
  bookingPage?: AppState["bookingPage"];
}

function migrateRule(rule: LegacyRule): Recurrence {
  const interval = Math.max(1, rule.interval ?? 1);
  if (rule.frequency === "daily") {
    return {
      kind: "cycle",
      length: interval,
      active: [0],
      startDate: rule.startDate,
      endDate: rule.endDate,
      exdates: rule.exdates,
    };
  }
  if (interval === 1) {
    return {
      kind: "weekdays",
      days: rule.byWeekday ?? [],
      startDate: rule.startDate,
      endDate: rule.endDate,
      exdates: rule.exdates,
    };
  }
  return {
    kind: "cycle",
    length: interval * 7,
    active: (rule.byWeekday ?? []).map(
      (weekday) => (weekday - new Date(`${rule.startDate}T12:00:00`).getDay() + 7) % 7,
    ),
    startDate: rule.startDate,
    endDate: rule.endDate,
    exdates: rule.exdates,
  };
}

function migrateV1(legacy: LegacyState): AppState | null {
  if (!legacy.routines || !legacy.events || !legacy.bookingPage) return null;
  const seed = seedState();
  const checklistTasks: RepeatingTask[] = (legacy.checklist?.items ?? []).map((item) => ({
    id: `task-${item.id}`,
    title: item.title,
    recurrence: {
      kind: "cycle",
      length: 7,
      active: [0, 1, 2, 3, 4, 5, 6],
      startDate: "2026-01-01",
    },
    tagIds: [],
  }));
  const checklistCompletions = (legacy.dailyChecklists ?? []).flatMap((daily) =>
    daily.doneItemIds.map((itemId) => ({ taskId: `task-${itemId}`, date: daily.date })),
  );
  return {
    tasks: [
      ...legacy.routines.map((routine) => ({
        ...routine,
        recurrence: migrateRule(routine.recurrence),
        tagIds: [],
      })),
      ...checklistTasks,
    ],
    completions: [
      ...(legacy.completions ?? []).map((entry) => ({
        taskId: entry.routineId,
        date: entry.date,
      })),
      ...checklistCompletions,
    ],
    events: legacy.events.map((event) => ({ ...event, tagIds: [] })),
    tags: seed.tags,
    goals: (legacy.goals ?? []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      horizon: goal.horizon,
      linkedTaskIds: goal.linkedRoutineIds,
    })),
    bookingPage: legacy.bookingPage,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.tasks && parsed.tags && parsed.events) return parsed;
    }
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const migrated = migrateV1(JSON.parse(legacyRaw) as LegacyState);
      if (migrated) {
        saveState(migrated);
        return migrated;
      }
    }
    return seedState();
  } catch {
    return seedState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

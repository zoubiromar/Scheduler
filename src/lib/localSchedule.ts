import { STORAGE_KEY } from "./storage";

const DEMO_ITEM_IDS = new Set([
  "task-stretch",
  "task-wind-down",
  "task-sunday-reset",
  "task-daily-0",
  "task-daily-1",
  "task-daily-2",
  "task-six-day-gym",
  "event-deep-work",
  "event-dinner",
]);

/** True when this browser contains a schedule the user created before signing in. */
export function hasUserCreatedLocalSchedule(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as {
      tasks?: Array<{ id: string }>;
      events?: Array<{ id: string }>;
    };
    const ids = [...(parsed.tasks ?? []), ...(parsed.events ?? [])].map(
      (item) => item.id,
    );
    return ids.some((id) => !DEMO_ITEM_IDS.has(id));
  } catch {
    return false;
  }
}

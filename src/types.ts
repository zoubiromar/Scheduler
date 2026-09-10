export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface RecurrenceBounds {
  startDate: string;
  endDate?: string;
  exdates?: string[];
}

export interface WeekdayRecurrence extends RecurrenceBounds {
  kind: "weekdays";
  days: Weekday[];
}

export interface CycleRecurrence extends RecurrenceBounds {
  kind: "cycle";
  length: number;
  active: number[];
}

export type Recurrence = WeekdayRecurrence | CycleRecurrence;

export interface RepeatingTask {
  id: string;
  title: string;
  notes?: string;
  startTime?: string;
  durationMinutes?: number;
  recurrence: Recurrence;
  tagIds: string[];
}

export interface TaskCompletion {
  taskId: string;
  date: string;
}

export type EventSource = "manual" | "booking" | "google";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  source: EventSource;
  tagIds: string[];
  completed?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Goal {
  id: string;
  title: string;
  horizon: "quarter" | "year";
  linkedTaskIds: string[];
}

export interface WeeklyWindow {
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

export interface BookingPage {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxPerDay: number;
  weeklyHours: WeeklyWindow[];
}

export interface AppState {
  tasks: RepeatingTask[];
  completions: TaskCompletion[];
  events: CalendarEvent[];
  tags: Tag[];
  goals: Goal[];
  bookingPage: BookingPage;
}

export interface TimeRange {
  startMinutes: number;
  endMinutes: number;
}

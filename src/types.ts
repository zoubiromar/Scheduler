export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RecurrenceFrequency = "daily" | "weekly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday?: Weekday[];
  startDate: string;
  endDate?: string;
  count?: number;
  exdates?: string[];
}

export interface Routine {
  id: string;
  title: string;
  notes?: string;
  startTime?: string;
  durationMinutes?: number;
  recurrence: RecurrenceRule;
}

export interface RoutineCompletion {
  routineId: string;
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
}

export interface ChecklistItem {
  id: string;
  title: string;
}

export interface ChecklistTemplate {
  id: string;
  reset: "daily";
  items: ChecklistItem[];
}

export interface DailyChecklistState {
  date: string;
  doneItemIds: string[];
}

export interface Goal {
  id: string;
  title: string;
  horizon: "quarter" | "year";
  linkedRoutineIds: string[];
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
  routines: Routine[];
  completions: RoutineCompletion[];
  events: CalendarEvent[];
  checklist: ChecklistTemplate;
  dailyChecklists: DailyChecklistState[];
  goals: Goal[];
  bookingPage: BookingPage;
}

export interface TimeRange {
  startMinutes: number;
  endMinutes: number;
}

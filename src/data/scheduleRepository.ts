import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { seedState } from "../lib/storage";
import type {
  AppState,
  CalendarEvent,
  ItemScope,
  ItemVisibility,
  Recurrence,
  RepeatingTask,
  Tag,
  TaskOccurrenceOverride,
} from "../types";

type ScheduleItem = RepeatingTask | CalendarEvent;

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function shortTime(value: string | null): string | undefined {
  return value ? value.slice(0, 5) : undefined;
}

export async function loadCloudSchedule(
  partnershipId: string,
): Promise<AppState> {
  const client = requireSupabase();
  const [itemsResult, tagsResult] = await Promise.all([
    client
      .from("schedule_items")
      .select(
        "*, schedule_item_assignees(user_id), schedule_item_tags(tag_id)",
      )
      .eq("partnership_id", partnershipId)
      .order("created_at"),
    client
      .from("tags")
      .select("id, name, color")
      .eq("partnership_id", partnershipId)
      .order("created_at"),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (tagsResult.error) throw tagsResult.error;

  const rows = itemsResult.data ?? [];
  const ids = rows.map((row) => row.id);
  const [overrideResult, completionResult] =
    ids.length === 0
      ? [{ data: [], error: null }, { data: [], error: null }]
      : await Promise.all([
          client
            .from("occurrence_overrides")
            .select("*")
            .in("item_id", ids),
          client
            .from("occurrence_completions")
            .select("*")
            .in("item_id", ids),
        ]);
  if (overrideResult.error) throw overrideResult.error;
  if (completionResult.error) throw completionResult.error;

  const completions = (completionResult.data ?? []).map((row) => ({
    taskId: row.item_id,
    date: row.occurrence_date,
    userId: row.user_id,
    completedAt: row.completed_at,
  }));
  const completionKeys = new Set(
    completions.map((entry) => `${entry.taskId}:${entry.date}`),
  );

  const sharedFields = (row: (typeof rows)[number]) => ({
    partnershipId: row.partnership_id,
    ownerId: row.created_by,
    scope: row.scope as ItemScope,
    visibility: row.visibility as ItemVisibility,
    completionRule: row.completion_rule as RepeatingTask["completionRule"],
    assigneeIds: (
      row.schedule_item_assignees as Array<{ user_id: string }>
    ).map((entry) => entry.user_id),
    anchorTimezone: row.anchor_timezone,
    tagIds: (row.schedule_item_tags as Array<{ tag_id: string }>).map(
      (entry) => entry.tag_id,
    ),
  });

  const tasks: RepeatingTask[] = rows
    .filter((row) => row.kind === "task")
    .map((row) => ({
      id: row.id,
      title: row.title,
      notes: row.notes ?? undefined,
      startTime: shortTime(row.start_time),
      durationMinutes: row.duration_minutes ?? undefined,
      recurrence: row.recurrence as unknown as Recurrence,
      ...sharedFields(row),
    }));

  const events: CalendarEvent[] = rows
    .filter((row) => row.kind === "event")
    .map((row) => ({
      id: row.id,
      title: row.title,
      date: row.item_date!,
      startTime: shortTime(row.start_time),
      durationMinutes: row.duration_minutes ?? undefined,
      source: row.source as CalendarEvent["source"],
      completed: completionKeys.has(`${row.id}:${row.item_date}`),
      ...sharedFields(row),
    }));

  const itemTags = new Map(
    rows.map((row) => [
      row.id,
      (row.schedule_item_tags as Array<{ tag_id: string }>).map(
        (entry) => entry.tag_id,
      ),
    ]),
  );
  const occurrenceOverrides: TaskOccurrenceOverride[] = (
    overrideResult.data ?? []
  ).map((row) => ({
    id: row.id,
    taskId: row.item_id,
    originalDate: row.original_date,
    date: row.display_date,
    title: row.title,
    notes: row.notes ?? undefined,
    startTime: shortTime(row.start_time),
    durationMinutes: row.duration_minutes ?? undefined,
    tagIds: itemTags.get(row.item_id) ?? [],
    cancelled: row.cancelled,
  }));
  const seed = seedState();

  return {
    tasks,
    events,
    completions,
    occurrenceOverrides,
    tags: (tagsResult.data ?? []) as Tag[],
    goals: [],
    bookingPage: seed.bookingPage,
  };
}

export async function upsertScheduleItem(
  item: ScheduleItem,
  partnershipId: string,
  currentUserId: string,
): Promise<void> {
  const client = requireSupabase();
  const isTask = "recurrence" in item;
  const scope = item.scope ?? "shared";
  const { error } = await client.from("schedule_items").upsert({
    id: item.id,
    partnership_id: partnershipId,
    created_by: item.ownerId ?? currentUserId,
    kind: isTask ? "task" : "event",
    scope,
    visibility: scope === "shared" ? "partner_visible" : item.visibility ?? "private",
    completion_rule: item.completionRule ?? "assigned",
    title: item.title,
    notes: "notes" in item ? item.notes ?? null : null,
    item_date: isTask ? null : item.date,
    start_time: item.startTime ?? null,
    duration_minutes: item.durationMinutes ?? null,
    recurrence: isTask ? item.recurrence : null,
    anchor_timezone:
      item.anchorTimezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    source: isTask ? "manual" : item.source,
  });
  if (error) throw error;

  const assigneeIds = item.assigneeIds?.length
    ? item.assigneeIds
    : [item.ownerId ?? currentUserId];
  const { error: clearAssigneesError } = await client
    .from("schedule_item_assignees")
    .delete()
    .eq("item_id", item.id);
  if (clearAssigneesError) throw clearAssigneesError;
  const { error: assigneeError } = await client
    .from("schedule_item_assignees")
    .insert(assigneeIds.map((userId) => ({ item_id: item.id, user_id: userId })));
  if (assigneeError) throw assigneeError;

  const { error: clearTagsError } = await client
    .from("schedule_item_tags")
    .delete()
    .eq("item_id", item.id);
  if (clearTagsError) throw clearTagsError;
  if (item.tagIds.length > 0) {
    const { error: tagError } = await client
      .from("schedule_item_tags")
      .insert(item.tagIds.map((tagId) => ({ item_id: item.id, tag_id: tagId })));
    if (tagError) throw tagError;
  }
}

export async function deleteScheduleItem(itemId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("schedule_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function setCloudCompletion(
  itemId: string,
  occurrenceDate: string,
  userId: string,
  completed: boolean,
): Promise<void> {
  const client = requireSupabase();
  const query = client
    .from("occurrence_completions")
    .delete()
    .eq("item_id", itemId)
    .eq("occurrence_date", occurrenceDate)
    .eq("user_id", userId);
  const { error } = completed
    ? await client.from("occurrence_completions").insert({
        item_id: itemId,
        occurrence_date: occurrenceDate,
        user_id: userId,
      })
    : await query;
  if (error) throw error;
}

export async function upsertCloudOverride(
  override: TaskOccurrenceOverride,
  userId: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("occurrence_overrides").upsert(
    {
      id: override.id,
      item_id: override.taskId,
      original_date: override.originalDate,
      display_date: override.date,
      title: override.title,
      notes: override.notes ?? null,
      start_time: override.startTime ?? null,
      duration_minutes: override.durationMinutes ?? null,
      cancelled: override.cancelled ?? false,
      updated_by: userId,
    },
    { onConflict: "item_id,original_date" },
  );
  if (error) throw error;
}

export async function deleteCloudOverride(
  itemId: string,
  originalDate: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("occurrence_overrides")
    .delete()
    .eq("item_id", itemId)
    .eq("original_date", originalDate);
  if (error) throw error;
}

export async function upsertCloudTag(
  tag: Tag,
  partnershipId: string,
  userId: string,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("tags").upsert({
    id: tag.id,
    partnership_id: partnershipId,
    created_by: userId,
    name: tag.name,
    color: tag.color,
  });
  if (error) throw error;
}

export async function sharePrivateItems(userId: string): Promise<number> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("schedule_items")
    .update({ visibility: "partner_visible" })
    .eq("created_by", userId)
    .eq("scope", "personal")
    .eq("visibility", "private")
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function deleteCloudTag(tagId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("tags").delete().eq("id", tagId);
  if (error) throw error;
}

export function subscribeToCloudSchedule(
  partnershipId: string,
  onChange: () => void,
): RealtimeChannel {
  const client = requireSupabase();
  return client
    .channel(`schedule:${partnershipId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "schedule_items",
        filter: `partnership_id=eq.${partnershipId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "occurrence_completions" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "occurrence_overrides" },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tags",
        filter: `partnership_id=eq.${partnershipId}`,
      },
      onChange,
    )
    .subscribe();
}

export async function importLocalSchedule(
  localState: AppState,
  partnershipId: string,
  userId: string,
  scope: ItemScope,
): Promise<void> {
  const client = requireSupabase();
  const tagMap = new Map<string, string>();
  for (const tag of localState.tags) {
    const id = crypto.randomUUID();
    tagMap.set(tag.id, id);
    const { error } = await client.from("tags").insert({
      id,
      partnership_id: partnershipId,
      created_by: userId,
      name: tag.name,
      color: tag.color,
    });
    if (error) throw error;
  }

  for (const source of [...localState.tasks, ...localState.events]) {
    const visibility: ItemVisibility =
      scope === "shared" ? "partner_visible" : "private";
    const item: ScheduleItem = {
      ...source,
      id: crypto.randomUUID(),
      ownerId: userId,
      partnershipId,
      scope,
      visibility,
      assigneeIds: [userId],
      completionRule: "assigned" as const,
      anchorTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tagIds: source.tagIds.map((tagId) => tagMap.get(tagId)).filter(Boolean) as string[],
    };
    await upsertScheduleItem(item, partnershipId, userId);
  }
}

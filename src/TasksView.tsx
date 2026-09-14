import { useState } from "react";
import { TagsView } from "./TagsView";
import { TaskEditor } from "./TaskEditor";
import { formatShortDate, formatTime } from "./lib/dates";
import type { RepeatingTask, Tag } from "./types";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
interface TasksViewProps {
  tasks: RepeatingTask[];
  tags: Tag[];
  startEditingId?: string | null;
  tagUsage: Record<string, number>;
  onSaveTask: (task: RepeatingTask) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTag: (tag: Tag) => void;
  onUpdateTag: (tagId: string, patch: Partial<Pick<Tag, "name" | "color">>) => void;
  onDeleteTag: (tagId: string) => void;
  onResetData: () => void;
  onEditorClosed: () => void;
}

export function recurrenceSummary(task: RepeatingTask): string {
  const rule = task.recurrence;
  const pattern =
    rule.kind === "weekdays"
      ? rule.days.map((day) => WEEKDAY_NAMES[day]).join(", ")
      : `Days ${rule.active.map((day) => day + 1).join(", ")} of ${rule.length}`;
  const start =
    rule.kind === "cycle" ? ` · from ${formatShortDate(rule.startDate)}` : "";
  const time = task.startTime ? ` · ${formatTime(task.startTime)}` : " · anytime";
  const end = rule.endDate ? ` · until ${formatShortDate(rule.endDate)}` : "";
  return `${pattern}${start}${time}${end}`;
}

export function TasksView({
  tasks,
  tags,
  startEditingId,
  tagUsage,
  onSaveTask,
  onDeleteTask,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onResetData,
  onEditorClosed,
}: TasksViewProps) {
  const [editingId, setEditingId] = useState<string | null>(startEditingId ?? null);
  const [creating, setCreating] = useState(false);

  const editing = tasks.find((task) => task.id === editingId);

  function closeEditor() {
    setCreating(false);
    setEditingId(null);
    onEditorClosed();
  }

  if (creating || editing) {
    return (
      <TaskEditor
        key={editing?.id ?? "new"}
        task={editing}
        tags={tags}
        onCreateTag={onCreateTag}
        onCancel={closeEditor}
        onSave={(task) => {
          onSaveTask(task);
          closeEditor();
        }}
        onDelete={
          editing
            ? (taskId) => {
                onDeleteTask(taskId);
                closeEditor();
              }
            : undefined
        }
      />
    );
  }

  return (
    <div>
      <div className="section-heading">
        <h2>Repeating tasks</h2>
        <button className="primary" type="button" onClick={() => setCreating(true)}>
          Add
        </button>
      </div>

      <div className="task-series-list">
        {tasks.map((task) => (
          <button className="series-card" type="button" key={task.id} onClick={() => setEditingId(task.id)}>
            <span className="series-main">
              <strong>{task.title}</strong>
              <span className="meta">{recurrenceSummary(task)}</span>
            </span>
            <span className="series-tags">
              {task.tagIds.map((tagId) => {
                const tag = tags.find((candidate) => candidate.id === tagId);
                return tag ? <TagPill tag={tag} key={tag.id} /> : null;
              })}
            </span>
            <span aria-hidden="true">Edit →</span>
          </button>
        ))}
      </div>

      <TagsView
        tags={tags}
        usage={tagUsage}
        onAdd={onCreateTag}
        onUpdate={onUpdateTag}
        onDelete={onDeleteTag}
      />

      <details className="app-settings">
        <summary>App settings</summary>
        <button className="danger" type="button" onClick={onResetData}>
          Reset local data
        </button>
      </details>
    </div>
  );
}

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span className="tag-pill" style={{ "--tag-color": tag.color } as React.CSSProperties}>
      {tag.name}
    </span>
  );
}

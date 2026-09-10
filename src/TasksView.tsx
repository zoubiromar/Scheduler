import { useState } from "react";
import { TaskEditor } from "./TaskEditor";
import { formatShortDate, formatTime } from "./lib/dates";
import type { RepeatingTask, Tag } from "./types";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TAG_COLORS = ["#3f6b58", "#c45c3e", "#7067a8", "#247b7b", "#b07d2b", "#a44a6f"];

interface TasksViewProps {
  tasks: RepeatingTask[];
  tags: Tag[];
  startCreating?: boolean;
  onSaveTask: (task: RepeatingTask) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTag: (tag: Tag) => void;
  onRenameTag: (tagId: string, name: string) => void;
  onDeleteTag: (tagId: string) => void;
  onEditorClosed: () => void;
}

export function recurrenceSummary(task: RepeatingTask): string {
  const rule = task.recurrence;
  const pattern =
    rule.kind === "weekdays"
      ? rule.days.map((day) => WEEKDAY_NAMES[day]).join(", ")
      : `Days ${rule.active.map((day) => day + 1).join(", ")} of ${rule.length}`;
  const time = task.startTime ? ` · ${formatTime(task.startTime)}` : " · anytime";
  const end = rule.endDate ? ` · until ${formatShortDate(rule.endDate)}` : "";
  return `${pattern}${time}${end}`;
}

export function TasksView({
  tasks,
  tags,
  startCreating,
  onSaveTask,
  onDeleteTask,
  onAddTag,
  onRenameTag,
  onDeleteTag,
  onEditorClosed,
}: TasksViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(Boolean(startCreating));
  const [tagName, setTagName] = useState("");

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

  function createTag() {
    const name = tagName.trim();
    if (!name) return;
    onAddTag({
      id: crypto.randomUUID(),
      name,
      color: TAG_COLORS[tags.length % TAG_COLORS.length],
    });
    setTagName("");
  }

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Repeating tasks</p>
          <h2>Your patterns</h2>
        </div>
        <button className="primary" type="button" onClick={() => setCreating(true)}>
          New repeating task
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

      <section className="tag-manager">
        <h2>Manage tags</h2>
        <div className="tag-manager-list">
          {tags.map((tag) => (
            <div className="tag-manager-row" key={tag.id}>
              <span className="tag-dot" style={{ background: tag.color }} />
              <input
                aria-label={`Rename ${tag.name}`}
                value={tag.name}
                onChange={(event) => onRenameTag(tag.id, event.target.value)}
              />
              <button className="ghost" type="button" onClick={() => onDeleteTag(tag.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="inline-form">
          <input
            value={tagName}
            placeholder="New tag name"
            onChange={(event) => setTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createTag();
            }}
          />
          <button className="ghost" type="button" onClick={createTag}>
            Add tag
          </button>
        </div>
      </section>
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

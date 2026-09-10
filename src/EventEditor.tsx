import { useState } from "react";
import type { CalendarEvent, Tag } from "./types";

interface EventEditorProps {
  date: string;
  event?: CalendarEvent;
  tags: Tag[];
  onSave: (event: CalendarEvent) => void;
  onCancel?: () => void;
  onDelete?: (eventId: string) => void;
}

export function EventEditor({
  date,
  event,
  tags,
  onSave,
  onCancel,
  onDelete,
}: EventEditorProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [eventDate, setEventDate] = useState(event?.date ?? date);
  const [timed, setTimed] = useState(event ? Boolean(event.startTime) : true);
  const [startTime, setStartTime] = useState(event?.startTime ?? "15:00");
  const [duration, setDuration] = useState(event?.durationMinutes ?? 60);
  const [tagIds, setTagIds] = useState(event?.tagIds ?? []);

  function save() {
    if (!title.trim()) return;
    onSave({
      id: event?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date: eventDate,
      startTime: timed ? startTime : undefined,
      durationMinutes: timed ? duration : undefined,
      source: event?.source ?? "manual",
      tagIds,
      completed: event?.completed ?? false,
    });
    if (!event) {
      setTitle("");
      setTagIds([]);
    }
  }

  return (
    <div className="inline-editor">
      <div className="form-title">
        <strong>{event ? "Edit one-time item" : "Add a one-time item"}</strong>
        {onCancel && (
          <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
        )}
      </div>
      <label className="field">
        <span>Name</span>
        <input value={title} placeholder="Task or event name" onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <label className="toggle-row editor-time-toggle">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          <span>Set a time</span>
        </label>
      </div>
      {timed && (
        <div className="field-grid">
          <label className="field">
            <span>Starts</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="field">
            <span>Minutes</span>
            <input
              type="number"
              min={5}
              max={960}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
        </div>
      )}
      <TagChoices tags={tags} selected={tagIds} onChange={setTagIds} />
      <div className="editor-actions">
        {event && onDelete && (
          <button className="danger" type="button" onClick={() => onDelete(event.id)}>Delete item</button>
        )}
        <button className="primary" type="button" disabled={!title.trim()} onClick={save}>
          {event ? "Save item" : "Add item"}
        </button>
      </div>
    </div>
  );
}

export function TagChoices({
  tags,
  selected,
  onChange,
}: {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="tag-picker compact-picker">
      <legend>Tags</legend>
      <div className="tag-list">
        {tags.map((tag) => (
          <button
            type="button"
            className={`tag-chip${selected.includes(tag.id) ? " selected" : ""}`}
            style={{ "--tag-color": tag.color } as React.CSSProperties}
            key={tag.id}
            onClick={() =>
              onChange(
                selected.includes(tag.id)
                  ? selected.filter((id) => id !== tag.id)
                  : [...selected, tag.id],
              )
            }
          >
            {tag.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

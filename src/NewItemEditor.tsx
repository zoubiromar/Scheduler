import { useState } from "react";
import { RecurrenceBoxes } from "./RecurrenceBoxes";
import { TagChoices } from "./TagChoices";
import type { CalendarEvent, Recurrence, RepeatingTask, Tag } from "./types";

interface NewItemEditorProps {
  date: string;
  tags: Tag[];
  onCreateTag: (tag: Tag) => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onSaveTask: (task: RepeatingTask) => void;
  onCancel: () => void;
}

export function NewItemEditor({
  date,
  tags,
  onCreateTag,
  onSaveEvent,
  onSaveTask,
  onCancel,
}: NewItemEditorProps) {
  const [kind, setKind] = useState<"one-time" | "repeating">("one-time");
  const [title, setTitle] = useState("");
  const [itemDate, setItemDate] = useState(date);
  const [timed, setTimed] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence>({
    kind: "weekdays",
    days: [1, 2, 3, 4, 5],
    startDate: date,
  });

  const selectedCount =
    recurrence.kind === "weekdays" ? recurrence.days.length : recurrence.active.length;
  const canSave = title.trim().length > 0 && (kind === "one-time" || selectedCount > 0);

  function save() {
    if (!canSave) return;
    const shared = {
      id: crypto.randomUUID(),
      title: title.trim(),
      startTime: timed ? startTime : undefined,
      durationMinutes: timed ? durationMinutes : undefined,
      tagIds,
    };

    if (kind === "repeating") {
      onSaveTask({ ...shared, recurrence });
    } else {
      onSaveEvent({
        ...shared,
        date: itemDate,
        source: "manual",
        completed: false,
      });
    }
  }

  return (
    <div className="inline-editor new-item-editor">
      <div className="form-title">
        <strong>New item</strong>
        <button className="ghost" type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="segmented item-kind" aria-label="Item type">
        <button
          className={kind === "one-time" ? "active" : ""}
          type="button"
          onClick={() => setKind("one-time")}
        >
          One-time
        </button>
        <button
          className={kind === "repeating" ? "active" : ""}
          type="button"
          onClick={() => setKind("repeating")}
        >
          Repeating
        </button>
      </div>

      <label className="field">
        <span>Name</span>
        <input
          autoFocus
          value={title}
          placeholder="What needs doing?"
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      {kind === "one-time" ? (
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={itemDate}
            onChange={(event) => setItemDate(event.target.value)}
          />
        </label>
      ) : (
        <>
          <RecurrenceBoxes value={recurrence} onChange={setRecurrence} />
          <label className="field">
            <span>Starts</span>
            <input
              type="date"
              value={recurrence.startDate}
              onChange={(event) =>
                setRecurrence({ ...recurrence, startDate: event.target.value })
              }
            />
          </label>
        </>
      )}

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={timed}
          onChange={(event) => setTimed(event.target.checked)}
        />
        <span>Set a time</span>
      </label>

      {timed && (
        <div className="field-grid">
          <label className="field">
            <span>Starts</span>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Minutes</span>
            <input
              type="number"
              min={5}
              max={960}
              step={5}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
            />
          </label>
        </div>
      )}

      <TagChoices
        tags={tags}
        selected={tagIds}
        onChange={setTagIds}
        onCreateTag={onCreateTag}
      />

      <div className="editor-actions">
        <button className="primary" type="button" disabled={!canSave} onClick={save}>
          Add
        </button>
      </div>
    </div>
  );
}

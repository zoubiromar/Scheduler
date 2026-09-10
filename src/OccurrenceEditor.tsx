import { useState } from "react";
import { TagChoices } from "./TagChoices";
import type { ResolvedTaskOccurrence } from "./lib/occurrences";
import { occurrenceToOverride } from "./lib/occurrences";
import type { Tag, TaskOccurrenceOverride } from "./types";

interface OccurrenceEditorProps {
  occurrence: ResolvedTaskOccurrence;
  tags: Tag[];
  onCreateTag: (tag: Tag) => void;
  onSave: (override: TaskOccurrenceOverride) => void;
  onRemove: (override: TaskOccurrenceOverride) => void;
  onReset: (taskId: string, originalDate: string) => void;
  onCancel: () => void;
}

export function OccurrenceEditor({
  occurrence,
  tags,
  onCreateTag,
  onSave,
  onRemove,
  onReset,
  onCancel,
}: OccurrenceEditorProps) {
  const [title, setTitle] = useState(occurrence.title);
  const [notes, setNotes] = useState(occurrence.notes ?? "");
  const [date, setDate] = useState(occurrence.date);
  const [timed, setTimed] = useState(Boolean(occurrence.startTime));
  const [startTime, setStartTime] = useState(occurrence.startTime ?? "09:00");
  const [duration, setDuration] = useState(occurrence.durationMinutes ?? 30);
  const [tagIds, setTagIds] = useState(occurrence.tagIds);

  function currentOverride(cancelled = false): TaskOccurrenceOverride {
    return occurrenceToOverride(occurrence, {
      title: title.trim() || occurrence.title,
      notes: notes.trim() || undefined,
      date,
      startTime: timed ? startTime : undefined,
      durationMinutes: timed ? duration : undefined,
      tagIds,
      cancelled,
    });
  }

  return (
    <div className="inline-editor occurrence-editor">
      <div className="form-title">
        <div>
          <strong>Edit only this occurrence</strong>
          <div className="meta">
            The repeating series and every other date stay unchanged.
          </div>
        </div>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      <label className="field">
        <span>Name</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field">
        <span>Notes (optional)</span>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="toggle-row editor-time-toggle">
          <input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} />
          <span>Set a time</span>
        </label>
      </div>
      {timed && (
        <div className="field-grid">
          <label className="field">
            <span>Starts</span>
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label className="field">
            <span>Minutes</span>
            <input
              type="number"
              min={5}
              max={960}
              step={5}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
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
      <div className="editor-actions occurrence-actions">
        <button className="danger" type="button" onClick={() => onRemove(currentOverride(true))}>
          Remove this date
        </button>
        {occurrence.isOverride && (
          <button
            className="ghost"
            type="button"
            onClick={() => onReset(occurrence.taskId, occurrence.originalDate)}
          >
            Reset to series
          </button>
        )}
        <button
          className="primary"
          type="button"
          disabled={!title.trim()}
          onClick={() => onSave(currentOverride())}
        >
          Save this occurrence
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { RecurrenceBoxes } from "./RecurrenceBoxes";
import { TagChoices } from "./TagChoices";
import { todayISO } from "./lib/dates";
import type { Recurrence, RepeatingTask, Tag } from "./types";

interface TaskEditorProps {
  task?: RepeatingTask;
  tags: Tag[];
  onSave: (task: RepeatingTask) => void;
  onCancel: () => void;
  onDelete?: (taskId: string) => void;
  onCreateTag: (tag: Tag) => void;
}

export function TaskEditor({
  task,
  tags,
  onSave,
  onCancel,
  onDelete,
  onCreateTag,
}: TaskEditorProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [timed, setTimed] = useState(Boolean(task?.startTime));
  const [startTime, setStartTime] = useState(task?.startTime ?? "09:00");
  const [duration, setDuration] = useState(task?.durationMinutes ?? 30);
  const [tagIds, setTagIds] = useState(task?.tagIds ?? []);
  const [hasEnd, setHasEnd] = useState(Boolean(task?.recurrence.endDate));
  const [skipDate, setSkipDate] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>(
    task?.recurrence ?? {
      kind: "weekdays",
      days: [1, 2, 3, 4, 5],
      startDate: todayISO(),
    },
  );

  const selectedCount =
    recurrence.kind === "weekdays" ? recurrence.days.length : recurrence.active.length;
  const endMissing = hasEnd && !recurrence.endDate;
  const endInvalid =
    hasEnd && Boolean(recurrence.endDate) && recurrence.endDate! < recurrence.startDate;
  const canSave =
    title.trim().length > 0 && selectedCount > 0 && !endMissing && !endInvalid;

  function save() {
    if (!canSave) return;
    onSave({
      id: task?.id ?? crypto.randomUUID(),
      title: title.trim(),
      notes: notes.trim() || undefined,
      startTime: timed ? startTime : undefined,
      durationMinutes: timed ? duration : undefined,
      recurrence: {
        ...recurrence,
        endDate: hasEnd ? recurrence.endDate : undefined,
      },
      tagIds,
    });
  }

  function skipOccurrence() {
    if (!skipDate) return;
    setRecurrence({
      ...recurrence,
      exdates: [...new Set([...(recurrence.exdates ?? []), skipDate])].sort(),
    });
    setSkipDate("");
  }

  return (
    <div className="editor-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{task ? "Edit series" : "New repeating task"}</p>
          <h2>{task?.title ?? "Build a pattern"}</h2>
        </div>
        <button className="ghost" type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <label className="field">
        <span>Task name</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>Notes (optional)</span>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>

      <label className="toggle-row">
        <input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} />
        <span>Set a time</span>
      </label>
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

      <RecurrenceBoxes value={recurrence} onChange={setRecurrence} />

      <div className="field-grid">
        <label className="field">
          <span>Starts on</span>
          <input
            type="date"
            value={recurrence.startDate}
            onChange={(event) => setRecurrence({ ...recurrence, startDate: event.target.value })}
          />
        </label>
        <label className="field end-field">
          <span>
            <input
              type="checkbox"
              checked={hasEnd}
              onChange={(event) => setHasEnd(event.target.checked)}
            />{" "}
            Ends
          </span>
          <input
            type="date"
            disabled={!hasEnd}
            min={recurrence.startDate}
            value={recurrence.endDate ?? ""}
            onChange={(event) =>
              setRecurrence({ ...recurrence, endDate: event.target.value || undefined })
            }
          />
        </label>
      </div>
      {endMissing && <p className="form-error">Choose an end date or turn Ends off.</p>}
      {endInvalid && <p className="form-error">End date cannot be before the start date.</p>}

      <TagChoices
        tags={tags}
        selected={tagIds}
        onChange={setTagIds}
        onCreateTag={onCreateTag}
      />

      {task && (
        <div className="skip-row">
          <label className="field">
            <span>Skip one occurrence</span>
            <input type="date" value={skipDate} onChange={(event) => setSkipDate(event.target.value)} />
          </label>
          <button className="ghost" type="button" disabled={!skipDate} onClick={skipOccurrence}>
            Add exception
          </button>
          {(recurrence.exdates?.length ?? 0) > 0 && (
            <p className="field-help">{recurrence.exdates!.length} skipped date(s)</p>
          )}
        </div>
      )}

      {selectedCount === 0 && <p className="form-error">Select at least one day.</p>}
      <div className="editor-actions">
        {task && onDelete && (
          <button className="danger" type="button" onClick={() => onDelete(task.id)}>
            Delete series
          </button>
        )}
        <button className="primary" type="button" disabled={!canSave} onClick={save}>
          {task ? "Save changes" : "Create repeating task"}
        </button>
      </div>
    </div>
  );
}

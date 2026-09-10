import type { Recurrence, Weekday } from "./types";

const WEEKDAYS: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

interface RecurrenceBoxesProps {
  value: Recurrence;
  onChange: (value: Recurrence) => void;
}

export function RecurrenceBoxes({ value, onChange }: RecurrenceBoxesProps) {
  function setKind(kind: Recurrence["kind"]) {
    const bounds = {
      startDate: value.startDate,
      endDate: value.endDate,
      exdates: value.exdates,
    };
    onChange(
      kind === "weekdays"
        ? { kind, days: [1, 2, 3, 4, 5], ...bounds }
        : { kind, length: 7, active: [0, 1, 2, 3, 4, 5, 6], ...bounds },
    );
  }

  function resize(delta: number) {
    if (value.kind !== "cycle") return;
    const length = Math.min(31, Math.max(2, value.length + delta));
    let active = value.active.filter((day) => day < length);
    if (active.length === 0) active = [length - 1];
    onChange({ ...value, length, active });
  }

  return (
    <fieldset className="recurrence-editor">
      <legend>Repeats</legend>
      <div className="segmented">
        <button
          type="button"
          className={value.kind === "weekdays" ? "active" : ""}
          onClick={() => setKind("weekdays")}
        >
          Weekdays
        </button>
        <button
          type="button"
          className={value.kind === "cycle" ? "active" : ""}
          onClick={() => setKind("cycle")}
        >
          Custom loop
        </button>
      </div>

      {value.kind === "weekdays" ? (
        <div className="pattern-boxes" aria-label="Days of week">
          {WEEKDAYS.map(({ value: day, label }) => (
            <button
              type="button"
              key={day}
              className={value.days.includes(day) ? "selected" : ""}
              aria-pressed={value.days.includes(day)}
              onClick={() =>
                onChange({
                  ...value,
                  days: value.days.includes(day)
                    ? value.days.filter((entry) => entry !== day)
                    : [...value.days, day],
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="loop-size">
            <span>Loop length: {value.length} days</span>
            <button type="button" onClick={() => resize(-1)} aria-label="Remove loop day">
              −
            </button>
            <button type="button" onClick={() => resize(1)} aria-label="Add loop day">
              +
            </button>
          </div>
          <div className="pattern-boxes numbered" aria-label="Days in loop">
            {Array.from({ length: value.length }, (_, index) => (
              <button
                type="button"
                key={index}
                className={value.active.includes(index) ? "selected" : ""}
                aria-pressed={value.active.includes(index)}
                title={`Day ${index + 1}`}
                onClick={() =>
                  onChange({
                    ...value,
                    active: value.active.includes(index)
                      ? value.active.filter((entry) => entry !== index)
                      : [...value.active, index].sort((a, b) => a - b),
                  })
                }
              >
                {index + 1}
              </button>
            ))}
          </div>
          <p className="field-help">Day 1 is the start date. Selected boxes repeat forever or until the end date.</p>
        </>
      )}
    </fieldset>
  );
}

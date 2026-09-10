import { useState } from "react";
import type { Tag } from "./types";

const DEFAULT_COLOR = "#7067a8";

interface TagsViewProps {
  tags: Tag[];
  usage: Record<string, number>;
  onAdd: (tag: Tag) => void;
  onUpdate: (tagId: string, patch: Partial<Pick<Tag, "name" | "color">>) => void;
  onDelete: (tagId: string) => void;
}

export function TagsView({ tags, usage, onAdd, onUpdate, onDelete }: TagsViewProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);

  function addTag() {
    const trimmed = name.trim();
    if (!trimmed || tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())) return;
    onAdd({ id: crypto.randomUUID(), name: trimmed, color });
    setName("");
    setColor(DEFAULT_COLOR);
  }

  return (
    <div className="tags-view">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your vocabulary</p>
          <h2>Tags</h2>
        </div>
      </div>
      <p className="caption">
        Create labels that make sense for your life—Together, Date night, Work, Sleep, or anything
        else. Names and colors can always be changed.
      </p>

      <div className="tag-editor-list">
        {tags.length === 0 && <p className="empty">No tags yet. Tasks can also be left untagged.</p>}
        {tags.map((tag) => (
          <div className="tag-editor-row" key={tag.id}>
            <input
              className="color-input"
              type="color"
              aria-label={`Color for ${tag.name}`}
              value={tag.color}
              onChange={(event) => onUpdate(tag.id, { color: event.target.value })}
            />
            <input
              aria-label={`Name for ${tag.name}`}
              value={tag.name}
              onChange={(event) => onUpdate(tag.id, { name: event.target.value })}
            />
            <span className="meta">
              {usage[tag.id] ?? 0} {(usage[tag.id] ?? 0) === 1 ? "item" : "items"}
            </span>
            <button className="danger" type="button" onClick={() => onDelete(tag.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="new-tag-card">
        <input
          className="color-input"
          type="color"
          aria-label="New tag color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
        <input
          aria-label="New tag name"
          placeholder="New tag name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addTag();
          }}
        />
        <button
          className="primary"
          type="button"
          disabled={!name.trim() || tags.some((tag) => tag.name.toLowerCase() === name.trim().toLowerCase())}
          onClick={addTag}
        >
          Create tag
        </button>
      </div>
    </div>
  );
}

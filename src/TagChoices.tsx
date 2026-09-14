import { useState } from "react";
import { nextTagColor } from "./lib/tags";
import type { Tag } from "./types";

interface TagChoicesProps {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onCreateTag: (tag: Tag) => void;
}

export function TagChoices({
  tags,
  selected,
  onChange,
  onCreateTag,
}: TagChoicesProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const duplicate = tags.some(
    (tag) => tag.name.toLowerCase() === name.trim().toLowerCase(),
  );

  function createTag() {
    const trimmed = name.trim();
    if (!trimmed || duplicate) return;
    const tag = {
      id: crypto.randomUUID(),
      name: trimmed,
      color: nextTagColor(tags.length),
    };
    onCreateTag(tag);
    onChange([...selected, tag.id]);
    setName("");
    setCreating(false);
  }

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
        <button
          className="quick-tag-toggle"
          type="button"
          aria-label="Create a tag"
          title="Create a tag"
          onClick={() => setCreating((value) => !value)}
        >
          +
        </button>
      </div>
      {creating && (
        <div className="quick-tag-form">
          <input
            aria-label="Quick tag name"
            placeholder="Tag name"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createTag();
              if (event.key === "Escape") setCreating(false);
            }}
          />
          <button className="primary" type="button" disabled={!name.trim() || duplicate} onClick={createTag}>
            Create
          </button>
        </div>
      )}
    </fieldset>
  );
}

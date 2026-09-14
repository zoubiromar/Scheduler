import type { Tag } from "./types";

interface TagFilterProps {
  tags: Tag[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export function TagFilter({ tags, selectedId, onChange }: TagFilterProps) {
  if (tags.length < 2) return null;

  return (
    <label className="tag-filter">
      <span className="sr-only">Filter by tag</span>
      <select
        aria-label="Filter by tag"
        value={selectedId ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">All tags</option>
      {tags.map((tag) => (
          <option value={tag.id} key={tag.id}>
            {tag.name}
          </option>
      ))}
      </select>
    </label>
  );
}

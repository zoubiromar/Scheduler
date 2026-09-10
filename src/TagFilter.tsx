import type { Tag } from "./types";

interface TagFilterProps {
  tags: Tag[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export function TagFilter({ tags, selectedId, onChange }: TagFilterProps) {
  return (
    <div className="filter-row" aria-label="Filter by tag">
      <button
        type="button"
        className={`filter-chip${selectedId === null ? " active" : ""}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          type="button"
          key={tag.id}
          className={`filter-chip${selectedId === tag.id ? " active" : ""}`}
          style={{ "--tag-color": tag.color } as React.CSSProperties}
          onClick={() => onChange(tag.id)}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}

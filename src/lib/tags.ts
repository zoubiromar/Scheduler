const TAG_COLORS = [
  "#3f6b58",
  "#c45c3e",
  "#7067a8",
  "#a06a2c",
  "#39728c",
  "#8a5573",
];

export function nextTagColor(tagCount: number): string {
  return TAG_COLORS[tagCount % TAG_COLORS.length];
}

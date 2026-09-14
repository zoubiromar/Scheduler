import { describe, expect, it } from "vitest";
import { nextTagColor } from "./tags";

describe("nextTagColor", () => {
  it("cycles through a stable palette", () => {
    expect(nextTagColor(0)).toBe("#3f6b58");
    expect(nextTagColor(1)).toBe("#c45c3e");
    expect(nextTagColor(6)).toBe("#3f6b58");
  });
});

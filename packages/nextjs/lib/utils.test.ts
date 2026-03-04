import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges classes and resolves Tailwind conflicts", () => {
    const classes = cn("px-2 py-1", "px-4", false && "hidden", "font-bold");
    expect(classes).toBe("py-1 px-4 font-bold");
  });
});

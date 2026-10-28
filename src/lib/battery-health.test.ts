import { describe, expect, it } from "vitest";
import { cellStatus, weakCells } from "./battery-health";

describe("battery health", () => {
  it("flags 12V block below 11.8V", () => {
    expect(cellStatus("11.7")).toBe("weak");
    expect(cellStatus("11.8")).toBe("ok");
  });
  it("flags 2V cell below 1.95V", () => {
    expect(cellStatus("1.94")).toBe("weak");
    expect(cellStatus("1.95")).toBe("ok");
  });
  it("lists weak cell numbers", () => {
    expect(weakCells(["12.5", "11.2", "", "13"])).toEqual([2]);
  });
});

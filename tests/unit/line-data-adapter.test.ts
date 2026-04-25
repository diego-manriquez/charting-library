import { describe, expect, it } from "vitest";
import {
  createLineBuffer,
  updateLineBuffer,
} from "../../src/data/adapters/line-data-adapter";

describe("line data adapter", () => {
  it("normalizes public line data into typed arrays", () => {
    const buffer = createLineBuffer([
      { time: new Date("2024-01-01T00:00:00.000Z"), value: 10.5 },
      { time: 1704153600000, value: 11.25 },
    ]);

    expect(buffer.length).toBe(2);
    expect(Array.from(buffer.time)).toEqual([1704067200000, 1704153600000]);
    expect(Array.from(buffer.value)).toEqual([10.5, 11.25]);
  });

  it("replaces the last point when update uses the same timestamp", () => {
    const initial = createLineBuffer([
      { time: 1704067200000, value: 10.5 },
      { time: 1704153600000, value: 11.25 },
    ]);

    const updated = updateLineBuffer(initial, {
      time: 1704153600000,
      value: 12,
    });

    expect(updated.length).toBe(2);
    expect(Array.from(updated.value)).toEqual([10.5, 12]);
  });

  it("appends a new point when update uses a later timestamp", () => {
    const initial = createLineBuffer([{ time: 1704067200000, value: 10.5 }]);

    const updated = updateLineBuffer(initial, {
      time: 1704153600000,
      value: 11.25,
    });

    expect(updated.length).toBe(2);
    expect(Array.from(updated.time)).toEqual([1704067200000, 1704153600000]);
    expect(Array.from(updated.value)).toEqual([10.5, 11.25]);
  });
});

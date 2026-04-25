import { describe, expect, it } from "vitest";
import {
  createVolumeBuffer,
  updateVolumeBuffer,
} from "../../src/data/adapters/volume-data-adapter";

describe("volume data adapter", () => {
  it("normalizes public volume data into typed arrays", () => {
    const buffer = createVolumeBuffer([
      { time: new Date("2024-01-01T00:00:00.000Z"), value: 1000, color: "#0f0" },
      { time: 1704153600000, value: 1200 },
    ]);

    expect(buffer.length).toBe(2);
    expect(Array.from(buffer.time)).toEqual([1704067200000, 1704153600000]);
    expect(Array.from(buffer.value)).toEqual([1000, 1200]);
    expect(buffer.color).toEqual(["#0f0", undefined]);
  });

  it("replaces the last bar when update uses the same timestamp", () => {
    const initial = createVolumeBuffer([
      { time: 1704067200000, value: 1000 },
      { time: 1704153600000, value: 1200, color: "#f00" },
    ]);

    const updated = updateVolumeBuffer(initial, {
      time: 1704153600000,
      value: 1500,
      color: "#0f0",
    });

    expect(updated.length).toBe(2);
    expect(Array.from(updated.value)).toEqual([1000, 1500]);
    expect(updated.color).toEqual([undefined, "#0f0"]);
  });

  it("appends a new bar when update uses a later timestamp", () => {
    const initial = createVolumeBuffer([{ time: 1704067200000, value: 1000 }]);

    const updated = updateVolumeBuffer(initial, {
      time: 1704153600000,
      value: 1200,
    });

    expect(updated.length).toBe(2);
    expect(Array.from(updated.time)).toEqual([1704067200000, 1704153600000]);
    expect(Array.from(updated.value)).toEqual([1000, 1200]);
  });
});

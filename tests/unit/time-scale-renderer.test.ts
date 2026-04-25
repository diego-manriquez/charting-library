import { describe, expect, it } from "vitest";
import { getTimeScaleTicks } from "../../src/rendering/renderers/time-scale-renderer";
import type { CandleBuffer } from "../../src/data/buffers/candle-buffer";

describe("getTimeScaleTicks", () => {
  it("creates visible time labels from the current range", () => {
    const day = 24 * 60 * 60 * 1000;
    const buffer: CandleBuffer = {
      time: new Float64Array([
        Date.UTC(2024, 0, 1),
        Date.UTC(2024, 0, 2),
        Date.UTC(2024, 0, 3),
        Date.UTC(2024, 0, 4),
        Date.UTC(2024, 0, 5),
      ]),
      open: new Float64Array([1, 1, 1, 1, 1]),
      high: new Float64Array([2, 2, 2, 2, 2]),
      low: new Float64Array([0, 0, 0, 0, 0]),
      close: new Float64Array([1, 1, 1, 1, 1]),
      volume: new Float64Array([1, 1, 1, 1, 1]),
      length: 5,
    };

    const ticks = getTimeScaleTicks(
      buffer,
      { from: 0, to: 4 },
      { x: 10, y: 0, width: 100, height: 20 },
      3,
    );

    expect(day).toBe(86400000);
    expect(ticks).toEqual([
      { x: 10, label: "01-01" },
      { x: 60, label: "01-03" },
      { x: 110, label: "01-05" },
    ]);
  });
});

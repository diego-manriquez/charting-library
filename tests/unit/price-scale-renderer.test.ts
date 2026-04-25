import { describe, expect, it } from "vitest";
import { getPriceScaleTicks } from "../../src/rendering/renderers/price-scale-renderer";

describe("getPriceScaleTicks", () => {
  it("creates evenly distributed ticks across the scale area", () => {
    const ticks = getPriceScaleTicks(
      { min: 10, max: 20 },
      { x: 0, y: 0, width: 72, height: 100 },
      3,
    );

    expect(ticks).toEqual([
      { y: 0, value: 20 },
      { y: 50, value: 15 },
      { y: 100, value: 10 },
    ]);
  });
});

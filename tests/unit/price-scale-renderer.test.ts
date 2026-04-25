import { describe, expect, it } from "vitest";
import { getPriceScaleTicks } from "../../src/rendering/renderers/price-scale-renderer";

describe("getPriceScaleTicks", () => {
  it("creates rounded price ticks projected into the plot area", () => {
    const ticks = getPriceScaleTicks(
      { min: 68.309, max: 134.56 },
      { x: 10, y: 20, width: 200, height: 100 },
      6,
    );

    expect(ticks.map((tick) => tick.value)).toEqual([
      130,
      120,
      110,
      100,
      90,
      80,
      70,
    ]);
    expect(ticks[0]?.y).toBeCloseTo(26.88, 1);
    expect(ticks[ticks.length - 1]?.y).toBeCloseTo(117.43, 1);
  });
});

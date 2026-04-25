import { describe, expect, it } from "vitest";
import { PriceScaleModel } from "../../src/core/scales/price-scale";
import type { CandleBuffer } from "../../src/data/buffers/candle-buffer";

describe("PriceScaleModel", () => {
  it("computes min and max from the visible candle range", () => {
    const model = new PriceScaleModel();
    const buffer: CandleBuffer = {
      time: new Float64Array([1, 2, 3]),
      open: new Float64Array([10, 20, 30]),
      high: new Float64Array([15, 25, 35]),
      low: new Float64Array([8, 18, 28]),
      close: new Float64Array([12, 22, 32]),
      volume: new Float64Array([100, 100, 100]),
      length: 3,
    };

    const range = model.getVisiblePriceRange([buffer], { from: 1, to: 2 });

    expect(range.min).toBeCloseTo(16.3);
    expect(range.max).toBeCloseTo(36.7);
  });
});

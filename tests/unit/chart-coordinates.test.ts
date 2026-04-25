import { describe, expect, it } from "vitest";
import {
  formatPriceLabel,
  formatTimeLabel,
  priceToY,
  xToIndex,
  yToPrice,
} from "../../src/rendering/common/chart-coordinates";

describe("chart coordinate helpers", () => {
  it("maps x positions to visible data indices", () => {
    expect(
      xToIndex(60, { from: 10, to: 19 }, { x: 10, y: 0, width: 100, height: 50 }),
    ).toBe(15);
  });

  it("maps price and y coordinates consistently", () => {
    const plotArea = { x: 0, y: 10, width: 100, height: 200 };
    const range = { min: 90, max: 110 };
    const price = 105;
    const y = priceToY(price, range, plotArea);

    expect(yToPrice(y, range, plotArea)).toBeCloseTo(price);
  });

  it("formats labels for crosshair use", () => {
    expect(formatPriceLabel(123.4)).toBe("123.4");
    expect(formatTimeLabel(Date.UTC(2024, 0, 5), 20)).toBe("01-05");
  });
});

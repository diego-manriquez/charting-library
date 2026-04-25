import { describe, expect, it } from "vitest";
import { TimeScaleModel } from "../../src/core/scales/time-scale";

describe("TimeScaleModel", () => {
  it("fits the visible range to the whole dataset", () => {
    const timeScale = new TimeScaleModel();

    timeScale.fitContent(5);

    expect(timeScale.getVisibleRange(5)).toEqual({ from: 0, to: 4 });
  });

  it("returns a safe empty range when there is no data", () => {
    const timeScale = new TimeScaleModel();

    timeScale.fitContent(0);

    expect(timeScale.getVisibleRange(0)).toEqual({ from: 0, to: 0 });
  });

  it("zooms around the provided anchor ratio", () => {
    const timeScale = new TimeScaleModel();

    timeScale.fitContent(100);
    timeScale.zoom(100, 0.5, 0.5);

    expect(timeScale.getVisibleRange(100)).toEqual({ from: 25, to: 74 });
  });

  it("pans the current visible window without changing its span", () => {
    const timeScale = new TimeScaleModel();

    timeScale.fitContent(100);
    timeScale.zoom(100, 0.5, 0.5);
    timeScale.pan(100, 10);

    expect(timeScale.getVisibleRange(100)).toEqual({ from: 35, to: 84 });
  });
});

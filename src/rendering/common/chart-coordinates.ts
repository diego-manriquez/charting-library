import type { PriceRange } from "../../core/scales/price-scale";
import type { IndexRange } from "../../core/scales/time-scale";
import type { PlotArea } from "./geometry";

export function indexToX(
  index: number,
  visibleRange: IndexRange,
  plotArea: PlotArea,
): number {
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const candleSpacing = plotArea.width / visibleCount;

  return plotArea.x + (index - visibleRange.from + 0.5) * candleSpacing;
}

export function xToIndex(
  x: number,
  visibleRange: IndexRange,
  plotArea: PlotArea,
): number {
  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const candleSpacing = plotArea.width / visibleCount;
  const rawIndex = visibleRange.from + (x - plotArea.x) / candleSpacing - 0.5;

  return clamp(
    Math.round(rawIndex),
    visibleRange.from,
    visibleRange.to,
  );
}

export function priceToY(
  price: number,
  range: PriceRange,
  plotArea: PlotArea,
): number {
  const ratio = (price - range.min) / (range.max - range.min);
  return plotArea.y + plotArea.height - ratio * plotArea.height;
}

export function yToPrice(
  y: number,
  range: PriceRange,
  plotArea: PlotArea,
): number {
  const clampedY = clamp(y, plotArea.y, plotArea.y + plotArea.height);
  const ratio = 1 - (clampedY - plotArea.y) / plotArea.height;
  return range.min + ratio * (range.max - range.min);
}

export function formatPriceLabel(value: number): string {
  return value.toFixed(value >= 100 ? 2 : 4).replace(/\.?0+$/, "");
}

export function formatTimeLabel(timestamp: number, visibleCount: number): string {
  const date = new Date(timestamp);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  if (visibleCount <= 40) {
    return `${month}-${day}`;
  }

  return `${date.getUTCFullYear()}-${month}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

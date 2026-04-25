import type { CandlestickSeriesOptions } from "../../public-api/types";
import type { CandleBuffer } from "../../data/buffers/candle-buffer";
import type { PlotArea } from "../common/geometry";
import type { PriceRange } from "../../core/scales/price-scale";
import type { IndexRange } from "../../core/scales/time-scale";

const DEFAULT_SERIES_OPTIONS: Required<CandlestickSeriesOptions> = {
  upColor: "#22c55e",
  downColor: "#ef4444",
  wickUpColor: "#22c55e",
  wickDownColor: "#ef4444",
  bodySpacingRatio: 0.72,
};

export function resolveSeriesOptions(
  options: CandlestickSeriesOptions | undefined,
): Required<CandlestickSeriesOptions> {
  return {
    upColor: options?.upColor ?? DEFAULT_SERIES_OPTIONS.upColor,
    downColor: options?.downColor ?? DEFAULT_SERIES_OPTIONS.downColor,
    wickUpColor: options?.wickUpColor ?? DEFAULT_SERIES_OPTIONS.wickUpColor,
    wickDownColor: options?.wickDownColor ?? DEFAULT_SERIES_OPTIONS.wickDownColor,
    bodySpacingRatio:
      options?.bodySpacingRatio ?? DEFAULT_SERIES_OPTIONS.bodySpacingRatio,
  };
}

export function renderCandlesticks(params: {
  context: CanvasRenderingContext2D;
  buffer: CandleBuffer;
  options: Required<CandlestickSeriesOptions>;
  visibleRange: IndexRange;
  priceRange: PriceRange;
  plotArea: PlotArea;
}): void {
  const { context, buffer, options, visibleRange, priceRange, plotArea } =
    params;

  if (buffer.length === 0 || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }

  const visibleCount = Math.max(1, visibleRange.to - visibleRange.from + 1);
  const candleSpacing = plotArea.width / visibleCount;
  const candleWidth = Math.max(
    1,
    Math.min(16, candleSpacing * options.bodySpacingRatio),
  );

  for (let index = visibleRange.from; index <= visibleRange.to; index += 1) {
    const open = getBufferValue(buffer.open, index);
    const high = getBufferValue(buffer.high, index);
    const low = getBufferValue(buffer.low, index);
    const close = getBufferValue(buffer.close, index);
    const isUp = close >= open;
    const x =
      plotArea.x + (index - visibleRange.from + 0.5) * candleSpacing;
    const highY = priceToY(high, priceRange, plotArea);
    const lowY = priceToY(low, priceRange, plotArea);
    const openY = priceToY(open, priceRange, plotArea);
    const closeY = priceToY(close, priceRange, plotArea);
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(closeY - openY));

    context.strokeStyle = isUp ? options.wickUpColor : options.wickDownColor;
    context.beginPath();
    context.moveTo(x, highY);
    context.lineTo(x, lowY);
    context.stroke();

    context.fillStyle = isUp ? options.upColor : options.downColor;
    context.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  }
}

function priceToY(price: number, range: PriceRange, plotArea: PlotArea): number {
  const ratio = (price - range.min) / (range.max - range.min);
  return plotArea.y + plotArea.height - ratio * plotArea.height;
}

function getBufferValue(buffer: Float64Array, index: number): number {
  const value = buffer[index];

  if (value === undefined) {
    throw new Error(`Missing buffer value at index ${index}.`);
  }

  return value;
}

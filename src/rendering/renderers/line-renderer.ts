import type { PriceRange } from "../../core/scales/price-scale";
import type { IndexRange } from "../../core/scales/time-scale";
import type { LineBuffer } from "../../data/buffers/line-buffer";
import type { LineSeriesOptions } from "../../public-api/types";
import { indexToX, priceToY } from "../common/chart-coordinates";
import type { PlotArea } from "../common/geometry";

const DEFAULT_LINE_SERIES_OPTIONS: Required<LineSeriesOptions> = {
  color: "#f59e0b",
  lineWidth: 2,
};

export function resolveLineSeriesOptions(
  options: LineSeriesOptions | undefined,
): Required<LineSeriesOptions> {
  return {
    color: options?.color ?? DEFAULT_LINE_SERIES_OPTIONS.color,
    lineWidth: options?.lineWidth ?? DEFAULT_LINE_SERIES_OPTIONS.lineWidth,
  };
}

export function renderLineSeries(params: {
  context: CanvasRenderingContext2D;
  buffer: LineBuffer;
  options: Required<LineSeriesOptions>;
  visibleRange: IndexRange;
  priceRange: PriceRange;
  plotArea: PlotArea;
}): void {
  const { context, buffer, options, visibleRange, priceRange, plotArea } = params;

  if (buffer.length === 0 || plotArea.width <= 0 || plotArea.height <= 0) {
    return;
  }

  context.strokeStyle = options.color;
  context.lineWidth = options.lineWidth;
  context.beginPath();

  let hasStarted = false;

  for (let index = visibleRange.from; index <= visibleRange.to; index += 1) {
    const value = buffer.value[index];

    if (value === undefined) {
      continue;
    }

    const x = indexToX(index, visibleRange, plotArea);
    const y = priceToY(value, priceRange, plotArea);

    if (!hasStarted) {
      context.moveTo(x, y);
      hasStarted = true;
      continue;
    }

    context.lineTo(x, y);
  }

  if (hasStarted) {
    context.stroke();
  }
}
